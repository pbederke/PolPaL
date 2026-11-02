// Restricts this module to server-side only; importing it in a Client Component
// will throw a build-time error, preventing accidental log leakage to the browser.
import 'server-only';

// Pino is a fast, low-overhead structured JSON logger for Node.js.
// All log output is JSON in production, making it easy to ingest into log
// aggregators (e.g. Datadog, Loki, CloudWatch).
import pino from 'pino';

const logger = pino({
  // Log level precedence:
  //   1. LOG_LEVEL env var (explicit override, e.g. "warn" in staging)
  //   2. "info"  — production default (avoids verbose debug noise)
  //   3. "debug" — development default (shows all log lines)
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),

  // Fields merged into every log record so log entries are self-describing
  // when shipped to a centralised log store:
  //   env     — "production" | "development" | "test"
  //   service — constant identifier used to filter PolPaL logs from other services
  base: { env: process.env.NODE_ENV, service: 'polpal' },

  // Emit ISO-8601 timestamps ("time":"2026-05-08T12:00:00.000Z") instead of
  // Unix epoch milliseconds so logs are human-readable without post-processing.
  timestamp: pino.stdTimeFunctions.isoTime,

  // In non-production environments, pipe output through pino-pretty for a
  // human-friendly, colourised console format. This block is omitted entirely
  // in production to avoid the overhead of the pretty-printing worker thread.
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,           // Colour-code log levels in the terminal
        translateTime: 'SYS:standard', // Format timestamps using the local system clock
        ignore: 'pid,hostname',   // Suppress noisy fields that are irrelevant locally
      },
    },
  }),
});

// Export a single shared logger instance. Import this wherever structured
// server-side logging is needed:
//   import logger from '@/lib/server/logger.server';
//   logger.info({ userId }, 'User logged in');
export default logger;
