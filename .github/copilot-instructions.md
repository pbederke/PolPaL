# PolPaL AI Development Guide

**PolPaL** is a political entities linkage database system built as a unified Next.js full-stack application using PostgreSQL with Prisma ORM.

## AI Assistant Rules

- **Always use `/graphify`** for any question about the codebase — architecture, data flow, what calls what, how something works, or where to find code. A knowledge graph of the project lives in `graphify-out/`; query it first before reading files speculatively.
- **Behavioral guidelines**: Always follow the coding conduct defined in `.github/CLAUDE.md` — think before coding, simplicity first, surgical changes, goal-driven execution. These apply regardless of which model is active.

## Architecture Overview

### Service Architecture
- **App**: Next.js 16 (App Router) with TypeScript — single unified project at repo root (port 3000)
- **API routes**: `src/app/api/` — Next.js Route Handlers (no separate Express server)
- **Database**: PostgreSQL 17 with modular Prisma schema (Prisma 7, `@prisma/adapter-pg`)
- **Proxy/Middleware**: `src/proxy.ts` — Next.js 16 edge proxy (auth enforcement + CSP nonce)
- **Deployment**: Docker Compose — single `frontend` container + `db` container (PostgreSQL 17)

### Project Layout
```
src/
  proxy.ts                  # Next.js 16 edge proxy (auth + CSP)
  app/
    api/{name}/             # Next.js Route Handlers (one folder per domain)
    admin/                  # Admin UI pages
                            # Includes: users, entities, countries, versions,
                            # datasets, projects, entries, changelog, analytics,
                            # user-activities, report-tickets, validation, …
    authentication/         # Login/register pages
    data/                   # Public data browsing pages
    manage/                 # Data management pages (authenticated)
    user/                   # User profile pages (authenticated)
  modules/{name}/           # Business logic (service + schema only)
    {name}.service.ts       # Prisma queries and domain logic
    {name}.schema.ts        # Zod validation schemas
  lib/
    server/                 # Server-only utilities (never imported by client components)
      auth.server.ts        # JWT decode, requireAuth(), role checks
      prisma.server.ts      # Prisma client singleton
      rate-limit.server.ts  # rate-limiter-flexible instances + getClientIp()
      email.server.ts       # Nodemailer helpers
      logger.server.ts      # Pino logger singleton
      security-events.server.ts  # Structured security event logging + alerting
      changelogLogger.ts    # Changelog mutation logging
    schemas/
      api.schemas.ts        # Shared Zod schemas used across modules
    shared/                 # Shared constants, enums, utils (safe for client import)
      enums.*.ts            # Domain enums (entities, users, references, etc.)
      mapping.*.tsx         # Label/display mappings
      utils.ts
  components/
    ui/                     # Generic shadcn/Radix UI primitives
    layout/                 # Header, Footer
    auth/                   # Auth-related components
  context/
    AuthContext.tsx          # Global auth state (React Context)
    useRequireAuth.tsx       # Hook: redirect to login if unauthenticated
prisma/
  models/                   # One .prisma file per model
                            # Key models: entities, entity-names, entity-changes,
                            # grouping-members, link-entries-entities, entries,
                            # versions, datasets, projects, countries,
                            # users, changelog, variables, report-tickets,
                            # validation, download-log, rate-limit-tables
  schema.prisma             # Root schema (references models/)
  migrations/
  seed/
```

### Key Data Models
- **Entities** (parties, groupings): Central model with `EntityTypesEnum` (PARTY, GROUPING, OTHER, UNKNOWN)
- **Countries**: Geographic context for entities
- **Individuals**: People associated with entities
- **Projects / Datasets / Versions**: External data source linkages
- **Users**: Authentication with email verification and admin approval workflow

## Development Patterns

### Module Structure
Each domain has two layers:

| Layer | Location | Responsibility |
|---|---|---|
| Route Handler | `src/app/api/{name}/route.ts` | HTTP req/res, auth check, Zod parse, call service |
| Service | `src/modules/{name}/{name}.service.ts` | Prisma queries, business logic |
| Schema | `src/modules/{name}/{name}.schema.ts` | Zod schemas for request/response validation |

Route handlers call services directly. There are no controllers.

### Authentication & Authorization
- **Cookie-based JWT**: `polpal_token` httpOnly cookie (HS256, 6 h lifetime)
- **`enforceRouteAuth(path, method)`**: call at the top of every route handler; looks up auth requirements from `routes.config.ts` and returns `AuthPayload`, `null` (public routes), or a `NextResponse` 401/403. Returns 403 (not 500) for routes missing from the config.
- **`routes.config.ts`**: central registry (`src/app/api/routes.config.ts`) — every route's `loggedIn`, `roles`, and `requiresApproval` are declared here. Adding a route without a config entry will return 403.
- **Role hierarchy**: `ADMIN > DATAMANAGER > EDITOR > CONTRIBUTOR > USER`
- **Admin approval**: new users require `approvedByAdmin: true` before they can access protected routes
- **Edge enforcement**: `src/proxy.ts` blocks unauthenticated requests to `/admin/*`, `/manage/*`, `/user/*`, `/api/admin/*`, `/api/links/*` before the route handler runs
- **Client state**: `AuthContext` + `useRequireAuth` hook

### Database Patterns
- **Modular schema**: each model in its own `.prisma` file under `prisma/models/`
- **Prisma client**: singleton in `src/lib/server/prisma.server.ts` using `@prisma/adapter-pg` (pg Pool, max 45 connections)
- **After schema changes**: run `npm run generate` then `npm run migrate`

### Security Patterns
- **CSP**: nonce-based in production (set by `proxy.ts`); relaxed in development. To use a nonce in a Server Component: `const nonce = (await headers()).get('x-nonce') ?? ''`
- **Rate limiting**: `rate-limiter-flexible` (PostgreSQL-backed) on login, register, reset-password, download, and disposable-email endpoints; `getClientIp()` reads the header named by `TRUSTED_PROXY_IP_HEADER` env var
- **Logging**: structured JSON via pino 10 (`logger.server.ts` — globalThis singleton to avoid listener leaks on hot-reload); security events via `logSecurityEvent()` in `security-events.server.ts` with sliding-window alerting
- **Input validation**: Zod 4 schemas (`z.email()`, `z.enum(SomeEnum)`) parsed in route handlers before any service call
- **Pagination**: always clamp `take` to a maximum (1000) to prevent DoS
- **Token revocation**: `tokenVersion` field on `Users` — `auth.server.ts` verifies the DB value on every request so revoked tokens are rejected immediately

## Essential Commands

```bash
# Development
npm run dev          # Next.js dev server (Turbopack)
npm run build        # Production build
npm run generate     # Regenerate Prisma client after schema changes
npm run migrate      # Apply database migrations (prisma migrate dev)

# Database
npx prisma migrate dev --name {description}  # Create and apply a migration
npx prisma studio                            # GUI database browser
npx prisma generate                          # Regenerate client only

# Docker (full stack)
docker compose up --build   # Build and run frontend + db containers
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `KEY_ENCRYPTION` | yes | JWT signing secret |
| `COOKIE_SECURE` | yes | Set `true` in production (controls `secure` flag on auth cookie) |
| `TRUSTED_PROXY_IP_HEADER` | prod | Header set by reverse proxy with real client IP (e.g. `x-forwarded-for` for Clever Cloud / HAProxy) |
| `RATE_LIMIT_IP_SALT` | prod | 32-byte hex string; IPs are HMAC-hashed before storage in rate-limit tables |
| `LOG_LEVEL` | no | Pino log level (default: `info` in production, `debug` in development) |

## Critical Implementation Notes

- **Server-only imports**: files in `src/lib/server/` use `server-only` and must never be imported by Client Components. Shared safe code lives in `src/lib/shared/`.
- **No CORS configuration needed**: the API and UI are served from the same origin.
- **Prisma changes**: always run `generate` after modifying any `.prisma` file, then `migrate`.
- **TypeScript**: standard ESM — no `.js` extensions needed in imports (Next.js handles resolution).
- **Adding a new domain module**: create `src/modules/{name}/{name}.service.ts` + `{name}.schema.ts`, then add `src/app/api/{name}/route.ts` calling into the service. Register every new route in `src/app/api/routes.config.ts`.
- **Zod 4**: use `z.string().email()` (not `z.email().max(n)`) and `z.enum(SomePrismaEnum)` consistently. Do not use `z.email()` standalone with chained string methods — prefer `z.string().email()`.
- **Pino logger**: import the singleton from `src/lib/server/logger.server.ts`. Never use `console.log` in server code — use `logger.info/warn/error` with structured objects.