# PolPaL — Testing

This document describes the test infrastructure, conventions, and file-by-file summaries for all 190 test files (1,608 tests) in the PolPaL project.

## Quick Reference

```bash
npm run test          # Run all tests once (CI mode)
npm run test:watch    # Run tests in watch mode (reruns on file changes)
npm run test:coverage # Run tests with V8 code coverage

# Run a single test file
npx vitest run src/modules/about/__tests__/about.service.test.ts
```

## Test Infrastructure

### Framework

| Component | Technology |
|---|---|
| Test runner | Vitest 4.1.10 |
| Coverage | @vitest/coverage-v8 |
| Environment | Node.js (not jsdom) |
| Globals | Enabled (`describe`, `it`, `expect`, `vi`, `beforeEach` without imports) |

### Configuration — `vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'server-only': path.resolve(__dirname, '__mocks__/server-only.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/app/api/**/*.ts', 'src/modules/**/*.ts'],
    },
  },
});
```

| Setting | Purpose |
|---|---|
| `alias '@'` | Maps `@/...` imports to `src/...`, matching the `tsconfig.json` path alias |
| `alias 'server-only'` | Redirects the Next.js `server-only` package to an empty mock module, preventing crashes when server modules are loaded in Vitest |
| `globals: true` | Makes `describe`, `it`, `expect`, `vi`, etc. available without explicit imports |
| `environment: 'node'` | Tests run in Node.js (server-side code, not browser) |
| `include` | Only `*.test.ts` files under `src/` are discovered |
| `coverage.include` | Coverage scoped to API routes and domain modules |

### Shared Mock Utilities — `src/__test-utils__/mocks.ts`

Every test file imports from this module. It provides:

#### `mockPrisma()`

Returns a fake Prisma client object with `vi.fn()` stubs for all 20 models used across the project:

| Model | Methods Mocked |
|---|---|
| `about` | findMany, findUnique, create, update, delete, count |
| `news` | findMany, findUnique, create, update, delete |
| `users` | findMany, findUnique, findFirst, create, update, delete |
| `entities` | findMany, findUnique, create, update, delete, count |
| `linksEntryToEntity` | findMany, findUnique, findFirst, create, update, delete, count, createMany, aggregate |
| `validationLinks` | findMany, findUnique, create, update, delete, count |
| `changelog` | findMany, create, count, groupBy |
| `countries` | findMany, findUnique, create, update, delete |
| `datasets` | findMany, findUnique, create, update, delete |
| `projects` | findMany, findUnique, create, update, delete |
| `versions` | findMany, findUnique, create, update, delete |
| `entries` | findMany, findUnique, findFirst, create, update, delete, count, createMany, deleteMany, aggregate, groupBy |
| `entityNames` | findMany, findUnique, create, update, delete |
| `entityChanges` | findMany, findUnique, create, update, delete |
| `entitiesInCountries` | findMany, findUnique, create, update, delete, createMany |
| `groupingMembers` | findMany, findUnique, create, update, delete |
| `references` | findMany, findUnique, create, update, delete |
| `reportTicket` | findMany, findUnique, create, update, delete |
| `variables` | findMany, findUnique, create, update, delete |
| `downloadLog` | create |

Plus two client-level methods:
- `$transaction` — Executes the callback directly with the same mock client (no real DB transaction)
- `$queryRaw` — Stub for raw SQL queries

#### `mockLogger()`

Returns a fake Pino logger with spy methods for all log levels (`error`, `warn`, `info`, `debug`, `trace`, `fatal`) plus `child()` which returns `this`.

#### Auth Constants

| Export | Value |
|---|---|
| `ADMIN_AUTH` | `{ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true }` |
| `USER_AUTH` | `{ userId: 2, username: 'testuser', role: 'USER', approvedByAdmin: true }` |

### `__mocks__/server-only.ts`

An empty module (`export {}`). The Vitest config aliases the `server-only` package to this file, allowing server modules that `import 'server-only'` to be imported in tests without errors.

### CI Pipeline — `.github/workflows/docker-image.yml`

```
Job 1: test (ubuntu-latest)
  1. npm ci
  2. npx prisma generate
  3. npm run lint
  4. npm run test

Job 2: build (needs: test)
  1. docker build
```

Tests must pass before the Docker image builds. No database is started in CI — all tests are pure unit tests with mocked Prisma.

## Conventions & Patterns

### Required Mocks

Every test file **must** mock these two modules at the top (hoisted by `vi.mock`):

```ts
vi.mock('@/lib/server/prisma.server', () => ({ prisma: mockPrisma() }));
vi.mock('@/lib/server/logger.server', () => ({ default: mockLogger() }));
```

### `as never` Cast Pattern

Partial mock data doesn't match full Prisma model types. All `mockResolvedValue()` calls with partial data use `as never`:

```ts
vi.mocked(prisma.countries.findMany).mockResolvedValue([
  { countrycodePolpal: 'DE', countryname: 'Germany' }
] as never);
```

### Route Handler Auth Mocking

Route handlers check `auth instanceof NextResponse`. Auth failure mocks must use `NextResponse.json(...)`:

```ts
vi.mocked(enforceRouteAuth).mockResolvedValue(
  NextResponse.json({ error: 'Forbidden' }, { status: 403 })
);
```

### Catch-Log-Rethrow Pattern

Service functions that catch, log, and rethrow errors are tested by mocking the Prisma model to reject, then asserting the error propagates and `logger.error` was called:

```ts
it('rethrows database errors after logging', async () => {
  vi.mocked(prisma.model.method).mockRejectedValue(new Error('DB error'));
  await expect(serviceFunction(args)).rejects.toThrow('DB error');
  expect(logger.error).toHaveBeenCalled();
});
```

### Module-Level Cache Caveat

Some services have module-level caches (`internal.service.ts`, `security-events.server.ts`). Tests use `vi.useFakeTimers()` with incrementing `fakeNow` to expire caches between tests. (The `internal.service.ts` caches are intentionally retained rather than migrated to `unstable_cache` — see `AUDIT_REPORT.md` E-006.)

---

## Test File Summary

| Category | Files | Tests |
|---|---|---|
| Service tests | 23 | ~441 |
| Route handler tests | 160 | ~933 |
| Shared schema tests | 2 | 128 |
| Server lib tests | 4 | 26 |
| Module schema tests | 18 | 278 |
| **Total** | **190** | **1,608** |

---

## Service Tests — `src/modules/*/__tests__/`

**23 files, ~441 tests.** All service functions that use catch-log-rethrow patterns are tested for error propagation.

### Simple CRUD Modules

| File | Tests | Describe Blocks |
|---|---|---|
| `report-tickets.service.test.ts` | 8 | getReportTickets, getReportTicketsByUser, createReportTicket, deleteReportTicket |
| `entity-names.service.test.ts` | 5 | getAllEntityNames, getEntityNamesForPolpalId, createEntityName, deleteEntityName |
| `entity-changes.service.test.ts` | 8 | getEntityChangesForPolpalId, createEntityChange, deleteEntityChange |
| `entities-in-countries.service.test.ts` | 10 | getAllEntitiesInCountries, getEntitiesInCountriesForPolpalId, createEntityInCountry, deleteEntityInCountry |
| `groupings.service.test.ts` | 8 | getGroupingMembersForGroupingId, getGroupingsForPolpalId, createGroupingMember, deleteGroupingMember |
| `variables.service.test.ts` | 7 | getVariablesByVersionKey, createVariable, deleteVariable |
| `references.service.test.ts` | 4 | getReferencesForPolpalId, createReference, deleteReference |

### Medium Complexity Modules

| File | Tests | Describe Blocks |
|---|---|---|
| `countries.service.test.ts` | 14 | getCountries, getCountriesWithCounts, getCountryByCountrycode, getCountryById, createCountry, updateCountry, deleteCountry |
| `datasets.service.test.ts` | 14 | getDatasets, getDatasetsWithProjects, getDatasetByKey, createDataset, updateDataset, deleteDataset, getDatasetVersions (rethrows), getDatasetInfos (rethrows) |
| `projects.service.test.ts` | 14 | getProjects, getProjectByKey, createProject, updateProject, deleteProject, getAllProjectDatasets (rethrows), getProjectInfos (rethrows) |
| `versions.service.test.ts` | 17 | getVersions (+ rethrows), getVersionByKey, getVersionsForDataset, createVersion (+ rethrows), updateVersion (+ rethrows), deleteVersion (+ rethrows), getVersionEntries (rethrows), getVersionInfos (rethrows), getVersionsWithLinkingProgress (rethrows) |
| `validation.service.test.ts` | 7 | getValidationLinks, getValidationLinkById, upsertValidation, deleteValidationLink, getRejectedValidations |
| `links.service.test.ts` | 9 | getLinksForPolpalId, getLinksByEntry, getLinksByEntries, createLink, createBulkLinks, deleteLinksForEntry, deleteLinksByEntriesAndPolpal, deleteValidationLink |
| `download-log.service.test.ts` | 3 | createDownloadLog |

### High Complexity Modules

| File | Tests | Describe Blocks |
|---|---|---|
| `admin.service.test.ts` | 62 | All admin CRUD for every entity type, user approval, changelog queries, activity overview |
| `entities.service.test.ts` | 26 | CRUD, hide/show with link validation, wikidata cache, colors, logos |
| `entries.service.test.ts` | 18 | getEntriesByVersionCountry (+ rethrows), getGroupedEntriesByCountry (+ rethrows), importEntriesStreaming, getEntriesForSync, syncEntries, getEntryByEntryId, getEntries, deleteEntriesByVersion, getUnknownEntries, getEntriesByVersionPaginated, getEntriesByVersionEntity (rethrows) |
| `authentication.service.test.ts` | 15 | loginUser, registerUser, requestPasswordReset, resetPassword, verifyUserEmail |
| `downloads.service.test.ts` | 20 | All streaming functions, all filter functions |
| `internal.service.test.ts` | 8 | getStats (+ cache expiry), getEntitiesByYear (+ cache expiry) |

---

## Route Handler Tests — `src/app/api/**/__tests__/`

**160 files, ~933 tests.** Every route handler has tests covering:
- **Auth denial** — `enforceRouteAuth` returning a NextResponse (403)
- **Happy path** — 200/201/204 on success
- **Error path** — 500 when service throws
- **Input validation** — 400 on invalid body/params where applicable

### Authentication Routes (8 files)

| Route | Tests | What's Tested |
|---|---|---|
| `POST /api/authentication/forgot-password` | 5 | Auth denial, rate limiting, invalid email, success, service error |
| `POST /api/authentication/login` | 8 | Rate limiting, invalid credentials, email not verified, success |
| `POST /api/authentication/logout` | 2 | Auth denial, success with cookie clearing |
| `POST /api/authentication/register` | 8 | Rate limiting, invalid input, duplicate username, success |
| `POST /api/authentication/resend-verification` | 5 | Rate limiting, invalid email, already verified, success |
| `POST /api/authentication/reset-password` | 4 | Rate limiting, invalid token, success |
| `GET /api/authentication/status` | 4 | Auth denial, not authenticated (401), authenticated (200), service error |
| `GET /api/authentication/verify-email` | 7 | Verifies email, redirects, expired/invalid tokens |

### Admin Routes (41 files)

All admin routes test auth denial, pagination, validation, and success/error paths. Covers `about`, `analytics`, `approveUsers`, `approveUsersCount`, `changelog/*`, `countries`, `datasets`, `entities`, `entities-in-countries`, `entity-changes`, `entity-names`, `entries`, `grouping-members`, `link-entries-entities`, `news`, `projects`, `references`, `report-tickets`, `user-activities`, `users`, `validation`, `versions`.

### Downloads Routes (11 files)

| Route | Tests | What's Tested |
|---|---|---|
| `GET /api/downloads/countries/stream` | 3 | Auth denial, rate limit, streaming CSV |
| `GET /api/downloads/entities/filters` | 3 | Auth denial, success, error |
| `GET /api/downloads/entities/stream` | 4 | Auth denial, rate limit, success with filters, streaming |
| `GET /api/downloads/entity-names/filters` | 3 | Auth denial, success, error |
| `GET /api/downloads/entity-names/stream` | 4 | Auth denial, rate limit, success with filters, streaming |
| `GET /api/downloads/entries/[key]/filters` | 4 | Auth denial, success, error, missing key |
| `GET /api/downloads/entries/[key]/stream` | 5 | Auth denial, rate limit, success with filters, missing key, stream error |
| `GET /api/downloads/groupings/filters` | 3 | Auth denial, success, error |
| `GET /api/downloads/groupings/stream` | 4 | Auth denial, rate limit, success with filters, streaming |
| `POST /api/downloads/scripts/log` | 5 | Auth denial, rate limit, invalid JSON, bad body, success |
| `GET /api/downloads/versions-overview/stream` | 3 | Rate limit, success with/without auth, streaming |

### Domain Routes (100 files)

| Route Group | Files | Tests |
|---|---|---|
| `about` | 2 | CRUD, validates input, auth |
| `countries` | 3 | CRUD, counts, validates code |
| `datasets` | 4 | CRUD, homepage, versions |
| `entities` | 10 | CRUD, sub-routes, random-colors, random-logos, hidden/unassigned/without-country |
| `entities-in-countries` | 9 | CRUD, country/entity info, groupings |
| `entity-changes` | 2 | CRUD, validates ID |
| `entity-names` | 2 | CRUD, validates ID |
| `entries` | 11 | CRUD, import, sync, by-version-and-country, unknown-entries |
| `groupings` | 4 | Member CRUD, membership |
| `links` | 6 | CRUD, by-entry-bulk (DELETE+POST), auto-import |
| `news` | 2 | CRUD, validates ID |
| `projects` | 3 | CRUD, datasets |
| `references` | 3 | CRUD, entities |
| `report-tickets` | 2 | CRUD, validates ID |
| `users` | 7 | Profile, password-change, entities, links, validated-links |
| `validate-links` | 2 | Validation, rejected-validations |
| `versions` | 4 | CRUD, entries, by-dataset, linking-overview |
| `variables` | 1 | Gets variables for version |
| `health` | 1 | Status check |
| `internal` | 2 | Statistics, entities-by-year |
| `wikidata-color` | 1 | Entity color lookup |
| `wikidata-logo` | 1 | Entity logo lookup |

---

## Schema Tests

### Shared Schemas — `src/lib/schemas/__tests__/api.schemas.test.ts`

**88 tests.** Validates all shared Zod schemas used across modules (LoginSchema, RegisterSchema, PasswordChangeSchema, CountryCreateSchema, EntityCreateSchema, etc.).

### Inline Schemas — `src/lib/schemas/__tests__/inline.schemas.test.ts`

**40 tests.** Tests 7 Zod schemas extracted from route handlers into `src/lib/schemas/inline.schemas.ts`:

| Schema | Source Route | Tests |
|---|---|---|
| `CreateUserSchema` | `admin/users` | 8 — valid, missing fields, weak password, invalid email, invalid role, valid roles |
| `UpdateUserSchema` | `admin/users/[id]` | 4 — valid, missing fields, invalid email, invalid role |
| `AutoLinkRowSchema` | `links/auto-import` | 6 — valid, all optional fields, null optionals, negative/non-int/missing polpalId |
| `AutoLinkBodySchema` | `links/auto-import` | 4 — valid array, empty array, non-array, exceeds 100K |
| `ResendSchema` | `authentication/resend-verification` | 3 — valid, invalid, missing |
| `UserActivitiesQuerySchema` | `admin/user-activities` | 4 — valid dates, empty object, invalid format, non-date |
| `ScriptLogBodySchema` | `downloads/scripts/log` | 6 — valid, empty, spaces, special chars, valid extras, exceeds 200 |
| `DeclineNoteSchema` | `admin/approveUsers/[id]` | 4 — valid, optional, exceeds 500, exactly 500 |

### Module Schemas — `src/modules/*/__tests__/*.schema.test.ts`

**18 files, 278 tests.** Tests Zod schemas defined in each module's `.schema.ts` file:

| Module | Schemas Tested | Tests |
|---|---|---|
| `countries` | getCountryByCountrycodeParams, createCountry, updateCountry, deleteCountry | 30 |
| `datasets` | createDataset, updateDataset | 22 |
| `entities` | createEntity, polpalIdParams, polpalIdDatasetParams, entityCountryParams, updateEntity | 20 |
| `entities-in-countries` | ByPolpalIdParams, ByCountrycodeParams, createEntitiesInCountries, IdParams | 14 |
| `entity-changes` | params, ByPolpalIdParams, createEntityChange | 20 |
| `entity-names` | params, ByPolpalIdParams, createEntityName | 31 |
| `entries` | importEntriesSingle, ImportEntriesSingle (array), syncEntriesBody | 17 |
| `groupings` | createGroupingMember, groupingMemberParams, ByPolpalIdParams, ByGroupingIdParams, countryParams | 20 |
| `projects` | createProject, updateProject | 19 |
| `validation` | ValidateLink, DeleteValidateLink | 18 |
| `versions` | createVersion, updateVersion | 30 |
| `about`, `downloads`, `internal`, `links`, `news`, `references`, `users` | *(empty schema files)* | 1 each |

---

## Server Library Tests — `src/lib/server/__tests__/`

**4 files, 26 tests.**

| File | Tests | What's Tested |
|---|---|---|
| `auth.server.test.ts` | 10 | JWT verification, getAuthPayload, requireAuth (401/403/role checks) |
| `route-auth.server.test.ts` | 5 | Per-route auth enforcement, public vs protected routes |
| `changelogLogger.test.ts` | 4 | Creates entries, handles recordId types, does not throw on failure |
| `security-events.server.test.ts` | 7 | Structured logging, sliding-window alerting, per-IP/event-type isolation |

---

## Writing New Tests

### New Service Test

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma, mockLogger } from '@/__test-utils__/mocks';

vi.mock('@/lib/server/prisma.server', () => ({ prisma: mockPrisma() }));
vi.mock('@/lib/server/logger.server', () => ({ default: mockLogger() }));
vi.mock('@/lib/server/changelogLogger', () => ({ logChangelog: vi.fn() }));

import { prisma } from '@/lib/server/prisma.server';
import { logger } from '@/lib/server/logger.server';
import { logChangelog } from '@/lib/server/changelogLogger';
import { myFunction } from '../my.service';

describe('my.service', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('myFunction', () => {
    it('does something', async () => {
      vi.mocked(prisma.myModel.findMany).mockResolvedValue([{ id: 1 }] as never);
      const result = await myFunction();
      expect(result).toBeDefined();
    });

    it('throws when not found', async () => {
      vi.mocked(prisma.myModel.findUnique).mockResolvedValue(null);
      await expect(myFunction(999)).rejects.toThrow('Not found');
    });

    it('rethrows DB errors after logging', async () => {
      vi.mocked(prisma.myModel.findMany).mockRejectedValue(new Error('DB error'));
      await expect(myFunction()).rejects.toThrow('DB error');
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
```

### New Route Handler Test

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { GET } from '../route';

describe('/api/my-route route', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 when forbidden', async () => {
    const { NextResponse } = await import('next/server');
    vi.mocked(enforceRouteAuth).mockResolvedValue(
      NextResponse.json({ message: 'Forbidden' }, { status: 403 }) as never
    );
    const response = await GET();
    expect(response.status).toBe(403);
  });

  it('returns 200 on success', async () => {
    vi.mocked(enforceRouteAuth).mockResolvedValue({
      userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true,
    } as never);
    const response = await GET();
    expect(response.status).toBe(200);
  });

  it('returns 500 on service error', async () => {
    vi.mocked(enforceRouteAuth).mockResolvedValue({
      userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true,
    } as never);
    vi.mocked(someService).mockRejectedValue(new Error('DB error'));
    const response = await GET();
    expect(response.status).toBe(500);
  });
});
```

### Checklist for New Test Files

- [ ] Import `describe, it, expect, vi, beforeEach` from `vitest`
- [ ] Import `mockPrisma, mockLogger` from `@/__test-utils__/mocks`
- [ ] `vi.mock('@/lib/server/prisma.server', ...)` with `mockPrisma()`
- [ ] `vi.mock('@/lib/server/logger.server', ...)` with `mockLogger()`
- [ ] Add any additional module mocks (e.g., `changelogLogger`, `bcrypt`, `email.server`)
- [ ] `beforeEach(() => vi.clearAllMocks())` at describe root
- [ ] Use `as never` for all partial mock data in `mockResolvedValue()`
- [ ] For route tests: mock `enforceRouteAuth` with `NextResponse.json(...)` for auth failures
- [ ] For route tests: include service error (500) test
- [ ] For service tests: include catch-log-rethrow test where applicable
- [ ] Register new API routes in `src/app/api/routes.config.ts`
