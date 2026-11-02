// Load variables from .env.local into process.env so DATABASE_URL is available
// during local development and testing without polluting the shell environment.
// In production the variables are injected by the container runtime instead.
import { config } from 'dotenv';
config({ path: '.env.local' });

// PrismaClient is the auto-generated query engine. It is imported here rather
// than directly in module files so the whole app shares one instance.
import { PrismaClient } from '@prisma/client';

// PrismaPg is the driver adapter that lets Prisma use the native `pg` (node-postgres)
// pool instead of its built-in Rust-based TCP connector. This gives us explicit
// control over connection pool sizing and is required when using Prisma with a
// managed Postgres service (e.g. Clever Cloud, Supabase, RDS).
import { PrismaPg } from '@prisma/adapter-pg';

// --- Singleton pattern ---
// Next.js hot-reloads modules during development, which would create a new
// PrismaClient (and a new connection pool) on every file change. To prevent
// connection exhaustion we attach the instance to `globalThis`, which survives
// hot-reloads. The cast is needed because TypeScript does not know about our
// custom property on the global object.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient;
};

// Configure the pg connection pool.
// `connectionString` — read from DATABASE_URL; must be a valid PostgreSQL DSN.
// `max: 40`          — upper bound on concurrent database connections.
//                      Keep below the PostgreSQL server's `max_connections`
//                      limit (default 100) and account for other services
//                      sharing the same DB instance.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  max: 40,
});

// Re-use an existing instance stored on `globalThis` (development hot-reload)
// or create a fresh one (first boot / production).
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    // Only emit warnings and errors to the console. Set to
    // ['query', 'info', 'warn', 'error'] locally when debugging slow queries.
    log: ['warn', 'error'],
  });

// Cache the instance on `globalThis` in non-production environments so that
// subsequent hot-reloads reuse it instead of opening a new pool.
// This block is intentionally skipped in production because the module is
// never re-evaluated there.
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
