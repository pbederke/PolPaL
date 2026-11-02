import 'server-only';
import logger from './logger.server';

// ─── Event types ──────────────────────────────────────────────────────────────

export type SecurityEventType =
  | 'AUTH_FAILURE'
  | 'RATE_LIMIT_HIT'
  | 'PERMISSION_DENIED'
  | 'INVALID_TOKEN'
  | 'REGISTRATION_FLOOD';

// ─── Alert thresholds ─────────────────────────────────────────────────────────
// If the same event type from the same IP reaches `count` times within
// `windowMs` milliseconds, a SECURITY ALERT is emitted at the `error` level.

const THRESHOLDS: Record<SecurityEventType, { count: number; windowMs: number }> = {
  AUTH_FAILURE:       { count: 10, windowMs: 60_000 },       // 10 failures / 60 s
  RATE_LIMIT_HIT:     { count: 5,  windowMs: 60_000 },       //  5 blocks   / 60 s
  PERMISSION_DENIED:  { count: 20, windowMs: 60_000 },       // 20 denials  / 60 s
  INVALID_TOKEN:      { count: 5,  windowMs: 60_000 },       //  5 bad tokens/ 60 s
  REGISTRATION_FLOOD: { count: 5,  windowMs: 3_600_000 },    //  5 floods   / 1 h
};

// ─── Sliding-window counter ────────────────────────────────────────────────────
// Keyed by "<event>:<ip>" → array of timestamps within the window.

const windows = new Map<string, number[]>();

// Periodically delete map entries whose entire timestamp array has expired.
// Without this, the map grows one entry per distinct (event, IP) pair that ever
// fired, and stale entries for IPs that stop making requests are never removed.
// .unref() ensures the timer doesn't prevent the process from exiting cleanly.
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of windows) {
    const eventType = key.split(':')[0] as SecurityEventType;
    const { windowMs } = THRESHOLDS[eventType];
    if (timestamps.every((t) => now - t >= windowMs)) {
      windows.delete(key);
    }
  }
}, 5 * 60_000).unref();

function exceedsThreshold(event: SecurityEventType, ip: string): boolean {
  const key = `${event}:${ip}`;
  const { count, windowMs } = THRESHOLDS[event];
  const now = Date.now();
  const timestamps = (windows.get(key) ?? []).filter((t) => now - t < windowMs);
  timestamps.push(now);
  windows.set(key, timestamps);
  return timestamps.length >= count;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface SecurityEventFields {
  ip: string;
  [key: string]: unknown;
}

/**
 * Log a security-relevant event with structured fields.
 * Automatically checks the sliding-window threshold and fires a SECURITY ALERT
 * at `error` level if the event frequency from that IP exceeds the configured limit.
 */
export function logSecurityEvent(
  event: SecurityEventType,
  fields: SecurityEventFields,
): void {
  logger.warn({ securityEvent: event, ...fields }, `[SECURITY] ${event}`);

  if (exceedsThreshold(event, fields.ip)) {
    logger.error(
      { securityEvent: 'SECURITY_ALERT', triggeredBy: event, ...fields },
      `[SECURITY ALERT] High-frequency ${event} detected from ${fields.ip}`,
    );
  }
}
