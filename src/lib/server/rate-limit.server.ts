// `pg` is the native node-postgres driver. We import the Pool class from it
// so the rate-limiter can maintain its own small, dedicated connection pool
// that is separate from the main Prisma pool — keeping rate-limit DB traffic
// isolated from application query traffic.
import pg from 'pg';
import { isIP } from 'node:net';

// rate-limiter-flexible provides production-grade, distributed rate limiting.
// RateLimiterPostgres persists counters in a Postgres table so limits are
// enforced consistently across multiple app replicas / restarts.
// RateLimiterMemory is the in-process fallback used when Postgres is
// temporarily unreachable or the table is still being initialised.
import { createHmac } from 'crypto';

import { RateLimiterPostgres, RateLimiterMemory } from 'rate-limiter-flexible';

import logger from './logger.server';

// ---------------------------------------------------------------------------
// Startup safety check
// ---------------------------------------------------------------------------
// If TRUSTED_PROXY_IP_HEADER is not configured, every request will be keyed
// to 'unknown' and all clients share a single rate-limit bucket. This is
// safe-by-default (the whole world gets throttled together) but makes per-IP
// limiting ineffective. Emit a structured warning so ops teams notice it.
// The check is skipped during the Next.js production build phase because no
// proxy header is available (or expected) at build time.
if (!process.env.TRUSTED_PROXY_IP_HEADER && process.env.NEXT_PHASE !== 'phase-production-build') {
  logger.warn(
    { securityEvent: 'MISCONFIGURATION' },
    '[rate-limiter] TRUSTED_PROXY_IP_HEADER is not set. Rate limiting will use a single shared ' +
    'bucket for all clients instead of per-IP buckets. Set this to the header your reverse proxy ' +
    'appends with the real client IP (e.g. TRUSTED_PROXY_IP_HEADER=x-forwarded-for for most ' +
    'load balancers and Cloudflare).',
  );
}

if (!process.env.RATE_LIMIT_IP_SALT && process.env.NEXT_PHASE !== 'phase-production-build') {
  logger.warn(
    { securityEvent: 'MISCONFIGURATION' },
    '[rate-limiter] RATE_LIMIT_IP_SALT is not set. Client IPs will be stored in plain text in ' +
    'rate-limiter tables. Set this to a random 32-byte hex string to hash IPs before storage.',
  );
}

// ---------------------------------------------------------------------------
// Dedicated connection pool for the rate limiter
// ---------------------------------------------------------------------------
// We use a separate pg.Pool (max: 3) rather than the shared Prisma pool so
// that a burst of rate-limit checks cannot starve application queries of
// connections, and vice-versa. Three connections is sufficient because
// rate-limiter-flexible serialises its DB operations per key.
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3,
});

// ---------------------------------------------------------------------------
// Shared in-memory fallback limiter
// ---------------------------------------------------------------------------
// This limiter acts as the `insuranceLimiter` for limiters that don't declare
// their own. If the Postgres backend is unreachable (e.g. during a DB restart
// or table migration), rate-limiter-flexible falls back to this in-memory
// store so limiting continues to work, albeit without cross-replica
// synchronisation. The limits mirror the login limiter's settings.
const memoryFallback = new RateLimiterMemory({ points: 5, duration: 60, blockDuration: 300 });

// ---------------------------------------------------------------------------
// Login limiter
// ---------------------------------------------------------------------------
// Protects the /api/auth/login endpoint against brute-force credential
// stuffing. Allows up to 5 attempts per IP in a 60-second sliding window;
// further attempts are blocked for 5 minutes.
export const loginLimiter = new RateLimiterPostgres(
  {
    storeClient: pool,
    tableName: 'rate_limiter_login',
    points: 5,           // max allowed attempts within the window
    duration: 60,        // sliding window length in seconds (1 minute)
    blockDuration: 300,  // penalty block duration in seconds (5 minutes)
    insuranceLimiter: memoryFallback,
    clearExpiredByTimeout: true, // auto-delete expired records to keep the table tidy; relies on regular traffic to trigger cleanup
  },
  (err) => {
    // Callback fires once after the limiter confirms the table exists (or fails
    // to create it). Log but do not crash — the memory fallback keeps us safe.
    if (err && process.env.NEXT_PHASE !== 'phase-production-build') logger.error({ err }, '[rate-limiter] Failed to initialise login limiter table');
  },
);

// ---------------------------------------------------------------------------
// Registration limiter
// ---------------------------------------------------------------------------
// Prevents automated account-creation spam. Tighter than the login limiter:
// only 3 registrations are allowed per IP per hour. Exceeding this blocks the
// IP for a full hour to slow down account-farming scripts.
export const registerLimiter = new RateLimiterPostgres(
  {
    storeClient: pool,
    tableName: 'rate_limiter_register',
    points: 3,           // max registrations within the window
    duration: 3600,      // sliding window in seconds (1 hour)
    blockDuration: 3600, // penalty block duration in seconds (1 hour)
    insuranceLimiter: new RateLimiterMemory({ points: 3, duration: 3600, blockDuration: 3600 }),
    clearExpiredByTimeout: true, // auto-delete expired records to keep the table tidy; relies on regular traffic to trigger cleanup
  },
  (err) => {
    if (err && process.env.NEXT_PHASE !== 'phase-production-build') logger.error({ err }, '[rate-limiter] Failed to initialise register limiter table');
  },
);

// ---------------------------------------------------------------------------
// Download limiter
// ---------------------------------------------------------------------------
// Guards dataset/file download endpoints against scraping or accidental DoS.
// 50 downloads per hour is generous for legitimate users but will catch
// automated bulk-download scripts. Uses its own in-memory fallback so the
// insurance limits match the Postgres limits exactly.
export const downloadLimiter = new RateLimiterPostgres(
  {
    storeClient: pool,
    tableName: 'rate_limiter_download',
    points: 50,         // max downloads within the window
    duration: 3600,      // sliding window in seconds (1 hour)
    blockDuration: 3600, // penalty block duration in seconds (1 hour)
    insuranceLimiter: new RateLimiterMemory({ points: 50, duration: 3600, blockDuration: 3600 }),
    clearExpiredByTimeout: true, // auto-delete expired records to keep the table tidy; relies on regular traffic to trigger cleanup
  },
  (err) => {
    if (err && process.env.NEXT_PHASE !== 'phase-production-build') logger.error({ err }, '[rate-limiter] Failed to initialise download limiter table');
  },
);

// ---------------------------------------------------------------------------
// Password-reset limiter
// ---------------------------------------------------------------------------
// Limits how often a password-reset email can be requested from a given IP.
// This prevents attackers from using the endpoint to flood victims' inboxes
// or enumerate valid accounts at scale. 3 requests per hour is sufficient
// for legitimate use and imposes meaningful cost on automated abuse.
export const passwordResetLimiter = new RateLimiterPostgres(
  {
    storeClient: pool,
    tableName: 'rate_limiter_password_reset',
    points: 3,           // max reset requests within the window
    duration: 3600,      // sliding window in seconds (1 hour)
    blockDuration: 3600, // penalty block duration in seconds (1 hour)
    insuranceLimiter: new RateLimiterMemory({ points: 3, duration: 3600, blockDuration: 3600 }),
    clearExpiredByTimeout: true, // auto-delete expired records to keep the table tidy; relies on regular traffic to trigger cleanup
  },
  (err) => {
    if (err && process.env.NEXT_PHASE !== 'phase-production-build') logger.error({ err }, '[rate-limiter] Failed to initialise password reset limiter table');
  },
);

// ---------------------------------------------------------------------------
// Password-change limiter
// ---------------------------------------------------------------------------
// Limits how often a logged-in user can attempt to change their password.
// Brute-forcing the *current* password with a stolen session is the attack
// this blocks, so it is keyed per user account (not per IP) — shared office
// NATs are not penalised. Reuses the password-reset table: both limiters
// write keys with distinct prefixes, so their buckets never collide.
export const passwordChangeLimiter = new RateLimiterPostgres(
  {
    storeClient: pool,
    tableName: 'rate_limiter_password_reset',
    points: 5,           // max change attempts within the window
    duration: 300,       // sliding window in seconds (5 minutes)
    blockDuration: 600,  // penalty block duration in seconds (10 minutes)
    insuranceLimiter: new RateLimiterMemory({ points: 5, duration: 300, blockDuration: 600 }),
    clearExpiredByTimeout: true, // auto-delete expired records to keep the table tidy; relies on regular traffic to trigger cleanup
  },
  (err) => {
    if (err && process.env.NEXT_PHASE !== 'phase-production-build') logger.error({ err }, '[rate-limiter] Failed to initialise password change limiter table');
  },
);

// ---------------------------------------------------------------------------
// Validate-email limiter
// ---------------------------------------------------------------------------
// Guards the public /api/validate-email endpoint against CPU-flooding abuse.
// The disposable-email check is entirely in-process, so Postgres persistence
// is unnecessary — RateLimiterMemory is sufficient and requires no DB table.
// 20 requests per minute per IP covers any legitimate registration flow.
export const validateEmailLimiter = new RateLimiterMemory({
  points: 20,      // max requests within the window
  duration: 60,    // sliding window in seconds (1 minute)
});

// ---------------------------------------------------------------------------
// Client IP extraction
// ---------------------------------------------------------------------------
/**
 * Extracts the real client IP from the request using the header configured
 * via TRUSTED_PROXY_IP_HEADER. Set this env var to whichever header your
 * reverse proxy *appends* the real client IP to (typically X-Forwarded-For).
 *
 *   HAProxy / most load balancers: append the client IP to X-Forwarded-For
 *                                  → TRUSTED_PROXY_IP_HEADER=x-forwarded-for
 *
 *   Nginx:       proxy_set_header X-Real-IP $remote_addr;
 *                → TRUSTED_PROXY_IP_HEADER=x-real-ip
 *
 *   Cloudflare:  CF-Connecting-IP is always the true client IP
 *                → TRUSTED_PROXY_IP_HEADER=cf-connecting-ip
 *
 * The rightmost value of the header is used: a proxy appends the real client
 * IP after anything the client supplied (e.g. "spoofed-value, <real-ip>"), so
 * the rightmost entry is the one the last trusted proxy wrote and cannot be
 * forged. Only a well-formed IP is accepted (isIP check); anything else falls
 * back to 'unknown'. All unresolved requests share one rate-limit bucket — the
 * safe failure mode (too-restrictive rather than too-permissive).
 *
 * Security note: the rightmost-value strategy is only safe when the configured
 * proxy appends (rather than passes through) this header and no untrusted hop
 * sits between the client and that proxy. Never point this at a header the
 * client controls directly (e.g. a passthrough X-Real-IP).
 */
export function getClientIp(request: Request): string {
  const trustedHeader = process.env.TRUSTED_PROXY_IP_HEADER?.toLowerCase();
  let raw = 'unknown';
  if (trustedHeader) {
    const value = request.headers.get(trustedHeader);
    if (value) {
      // Proxies append the real client IP to whatever the client sent
      // (e.g. "spoofed-value, <real-client-ip>"). The rightmost value is
      // the one the last trusted proxy wrote, so it is the only part we
      // can trust — the leftmost is attacker-controlled.
      const parts = value.split(',');
      const candidate = parts[parts.length - 1]?.trim() ?? '';
      // Only accept a well-formed IP; anything else falls back to the
      // shared 'unknown' bucket (safe direction: over-throttle, never
      // under-throttle) and keeps junk out of the rate-limiter tables.
      if (candidate && isIP(candidate) !== 0) raw = candidate;
    }
  }
  const salt = process.env.RATE_LIMIT_IP_SALT;
  if (salt) return createHmac('sha256', salt).update(raw).digest('hex');
  return raw;
}
