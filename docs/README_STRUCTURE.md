# PolPaL — Project Structure

```
PolPaL_test/
├── src/                   # All application source code
│   ├── proxy.ts           # Next.js edge middleware (auth enforcement + CSP nonce)
│   ├── app/               # Next.js App Router (pages + API routes)
│   ├── components/        # Reusable React components
│   ├── context/           # React context providers and hooks
│   ├── lib/               # Shared utilities, server singletons, schemas
│   ├── modules/           # Business logic (service + schema per domain)
│   └── types/             # TypeScript type declarations
├── prisma/                # Database schema, migrations, seed scripts
│   ├── models/            # Split Prisma model files (one per table)
│   ├── migrations/        # Generated migration history
│   └── seed/              # Seed scripts and JSON fixture data
├── public/                # Static assets (images, flags, R scripts)
├── docs/                  # Internal documentation
├── Dockerfile             # Multi-stage Docker build (Node 24 Alpine)
├── compose.yaml           # Docker Compose for local development
├── next.config.ts         # Next.js configuration (standalone output, security headers)
├── prisma.config.ts       # Prisma configuration (schema path, seed)
├── tailwind.config.ts     # Tailwind CSS configuration
├── tsconfig.json          # TypeScript compiler options
├── eslint.config.mjs      # ESLint configuration
└── .env.local             # Local environment variables (git-ignored)
```

---

## Source Code — `src/`

### App Router Pages — `src/app/`

All UI pages use the Next.js App Router. Each folder with a `page.tsx` is a route. Every page also has a co-located `*Client.tsx` file that holds the client-side React component.

```
src/app/
├── layout.tsx                          # Root layout (wraps all pages; includes Header/Footer/AuthProvider)
├── page.tsx                            # Homepage  →  /
├── HomeClient.tsx                      # Client component for the homepage
├── globals.css                         # Global CSS / Tailwind base
├── error.tsx                           # Global error boundary
├── not-found.tsx                       # Global 404 page
├── robots.ts                           # Generates /robots.txt
├── sitemap.ts                          # Generates /sitemap.xml
├── favicon.ico

├── admin/                              # Admin interface (ADMIN role required)
│   ├── AdminClient.tsx
│   ├── page.tsx                        #   /admin  — admin dashboard with navigation cards
│   ├── about/                          #   /admin/about  — manage about page content
│   ├── analytics/                      #   /admin/analytics  — usage analytics
│   ├── approveUsers/                   #   /admin/approveUsers  — approve pending registrations
│   ├── changelog/                      #   /admin/changelog  — view create/update/delete audit log
│   ├── countries/                      #   /admin/countries  — manage countries
│   ├── datasets/                       #   /admin/datasets  — manage datasets
│   ├── entities/                       #   /admin/entities  — manage political entities
│   ├── entities-in-countries/          #   /admin/entities-in-countries  — manage entity↔country links
│   ├── entity-changes/                 #   /admin/entity-changes  — manage entity change records
│   ├── entity-names/                   #   /admin/entity-names  — manage entity name records
│   ├── entries/                        #   /admin/entries  — manage dataset entries
│   ├── grouping-members/               #   /admin/grouping-members  — manage grouping membership
│   ├── link-entries-entities/          #   /admin/link-entries-entities  — manage entry↔entity links
│   ├── news/                           #   /admin/news  — manage news articles
│   ├── projects/                       #   /admin/projects  — manage projects
│   ├── references/                     #   /admin/references  — manage source references
│   ├── report-tickets/                 #   /admin/report-tickets  — review user-submitted reports
│   ├── users/                          #   /admin/users  — manage user accounts
│   ├── validation/                     #   /admin/validation  — review link validation records
│   └── versions/                       #   /admin/versions  — manage dataset versions

├── authentication/
│   ├── forgot-password/                #   /authentication/forgot-password
│   ├── login/                          #   /authentication/login
│   ├── register/                       #   /authentication/register
│   │   └── approval/                   #   /authentication/register/approval — awaiting admin approval
│   ├── reset-password/                 #   /authentication/reset-password
│   ├── session-expired/                #   /authentication/session-expired — JWT expired page
│   └── verify-email/                   #   /authentication/verify-email — email verification landing

├── data/
│   ├── countries/
│   │   ├── page.tsx                    #   /data/countries  — list all countries
│   │   ├── missing/                    #   /data/countries/missing  — entities without a country
│   │   └── [countrycodePolpal]/        #   /data/countries/:countrycodePolpal  — country detail page
│   ├── download/                       #   /data/download  — download page
│   ├── entities/
│   │   └── [PolPaLId]/                 #   /data/entities/:polpalId  — entity detail page
│   │       └── [versionKey]/           #   /data/entities/:polpalId/:versionKey  — entity detail filtered by version
│   ├── entries/
│   │   └── [entryId]/                  #   /data/entries/:entryId  — entity detail page
│   ├── linking/
│   │   ├── page.tsx                    #   /data/linking  — linking overview dashboard
│   │   └── [versionKey]/
│   │       ├── page.tsx                #   /data/linking/:versionKey  — version-level linking view
│   │       └── [countrycodePolpal]/    #   /data/linking/:versionKey/:countrycodePolpal  — per-country linking
│   ├── projects/
│   │   ├── page.tsx                    #   /data/projects  — list all projects
│   │   └── [projectKey]/
│   │       ├── page.tsx                #   /data/projects/:projectKey  — project detail
│   │       └── [datasetKey]/
│   │           ├── page.tsx            #   /data/projects/:projectKey/:datasetKey  — dataset detail
│   │           └── [versionKey]/
│   │               ├── page.tsx              #   /data/projects/:projectKey/:datasetKey/:versionKey  — version detail (entries table)
│   │               ├── all-entries/          #   /data/projects/:projectKey/:datasetKey/:versionKey/all-entries  — full entries table
│   │               └── [countrycodePolpal]/  #   /data/projects/:projectKey/:datasetKey/:versionKey/:countrycodePolpal
│   └── quality-checks/
│       ├── page.tsx                          #   /data/quality-checks  — data quality check tools
│       ├── commented-entities/               #   /data/quality-checks/commented-entities
│       ├── hidden-entities/                  #   /data/quality-checks/hidden-entities
│       ├── rejected-validations/             #   /data/quality-checks/rejected-validations
│       ├── unassigned-entities/              #   /data/quality-checks/unassigned-entities
│       └── unknown-entries/                  #   /data/quality-checks/unknown-entries

├── documentation/
│   ├── about/                          #   /documentation/about
│   ├── codebook/                       #   /documentation/codebook
│   ├── contact/                        #   /documentation/contact
│   ├── contribute/                     #   /documentation/contribute
│   ├── data-protection/                #   /documentation/data-protection
│   ├── imprint/                        #   /documentation/imprint
│   └── news/                           #   /documentation/news  — public news listing

├── manage/                             # Data management forms (ADMIN/DATAMANAGER role)
│   ├── country/
│   │   ├── create/                     #   /manage/country/create
│   │   └── update/[countrycodePolpal]/ #   /manage/country/update/:code
│   ├── dataset/
│   │   ├── create/                     #   /manage/dataset/create
│   │   └── update/[datasetKey]/        #   /manage/dataset/update/:key
│   ├── entity/
│   │   ├── create/                     #   /manage/entity/create
│   │   └── update/[polpalId]/          #   /manage/entity/update/:id
│   ├── entity-change/create/           #   /manage/entity-change/create
│   ├── entity-in-country/create/       #   /manage/entity-in-country/create
│   ├── entity-name/create/             #   /manage/entity-name/create
│   ├── entries/[versionKey]/
│   │   ├── create/                     #   /manage/entries/:version/create  — CSV import
│   │   └── update/                     #   /manage/entries/:version/update  — re-upload / delete
│   ├── grouping-relationship/create/   #   /manage/grouping-relationship/create
│   ├── news/
│   │   ├── create/                     #   /manage/news/create
│   │   └── update/[newsId]/            #   /manage/news/update/:id
│   ├── project/
│   │   ├── create/                     #   /manage/project/create
│   │   └── update/[projectKey]/        #   /manage/project/update/:key
│   └── version/
│       ├── create/                     #   /manage/version/create
│       └── update/[versionKey]/        #   /manage/version/update/:key

└── user/
    ├── page.tsx                        #   /user  — logged-in user profile & password change
    ├── created-entities/               #   /user/created-entities  — entities created by the user
    ├── linked-entities/                #   /user/linked-entities  — entities linked by the user
    ├── tickets/                        #   /user/tickets  — user's submitted report tickets
    └── validated-links/                #   /user/validated-links  — links validated by the user
```

---

### API Routes — `src/app/api/`

All routes live under `/api/` and are Next.js Route Handlers (`route.ts`). Authentication is enforced per-route using `requireAuth()` from `src/lib/server/auth.server.ts`. Route-level auth configuration is centralised in `routes.config.ts`.

```
api/
├── about/
│   ├── route.ts                        # GET / POST — about page content
│   └── [id]/route.ts                   # PATCH / DELETE — single about entry

├── admin/
│   ├── about/
│   │   ├── route.ts                    # GET  — admin: list about entries
│   │   └── [id]/route.ts               # DELETE — admin: delete about entry
│   ├── analytics/route.ts              # GET  — usage analytics
│   ├── approveUsers/
│   │   ├── route.ts                    # GET  — list users pending approval
│   │   └── [approveUserId]/route.ts    # PATCH — approve or reject a user
│   ├── approveUsersCount/route.ts      # GET  — count of pending approvals (badge counter)
│   ├── changelog/
│   │   ├── created/route.ts            # GET  — changelog: created records
│   │   ├── deleted/route.ts            # GET  — changelog: deleted records
│   │   └── updated/route.ts            # GET  — changelog: updated records
│   ├── countries/route.ts              # GET  — admin country list (all fields)
│   ├── datasets/
│   │   ├── route.ts                    # GET  — admin: list all datasets
│   │   └── [datasetKey]/route.ts       # DELETE — admin: delete a dataset
│   ├── entities/route.ts               # GET  — admin entity list
│   ├── entities-in-countries/
│   │   ├── route.ts                            # GET  — admin: list entity-in-country links
│   │   └── [entityInCountryId]/route.ts        # DELETE — admin: delete a link
│   ├── entity-changes/
│   │   ├── route.ts                    # GET  — admin: list entity change records
│   │   └── [entityChangeId]/route.ts   # DELETE — admin: delete an entity change
│   ├── entity-names/
│   │   ├── route.ts                    # GET  — admin: list entity names
│   │   └── [entityNameId]/route.ts     # DELETE — admin: delete an entity name
│   ├── entries/
│   │   ├── route.ts                    # GET  — admin: list entries
│   │   └── [entryId]/route.ts          # DELETE — admin: delete an entry
│   ├── grouping-members/
│   │   ├── route.ts                          # GET  — admin: list grouping members
│   │   └── [groupingMemberId]/route.ts       # DELETE — admin: delete a member
│   ├── link-entries-entities/
│   │   ├── route.ts                    # GET  — admin: list entry↔entity links
│   │   └── [linkId]/route.ts           # DELETE — admin: delete a link
│   ├── news/route.ts                   # GET  — admin: list news articles
│   ├── projects/
│   │   ├── route.ts                    # GET  — admin: list projects
│   │   └── [projectKey]/route.ts       # DELETE — admin: delete a project
│   ├── references/
│   │   ├── route.ts                              # GET  — admin: list references
│   │   └── [deleteReferenceId]/route.ts          # DELETE — admin: delete a reference
│   ├── report-tickets/
│   │   ├── route.ts                    # GET  — admin: list report tickets
│   │   └── [id]/route.ts               # DELETE — admin: delete a ticket
│   ├── validation/
│   │   ├── route.ts                    # GET  — admin: list validation records
│   │   └── [validationId]/route.ts     # DELETE — admin: delete a validation record
│   ├── versions/
│   │   ├── route.ts                    # GET  — admin: list versions
│   │   └── [versionKey]/route.ts       # DELETE — admin: delete a version
│   └── users/
│       ├── route.ts                    # GET  — list all users
│       └── [deleteUserId]/route.ts     # DELETE — delete a user

├── authentication/
│   ├── forgot-password/route.ts        # POST  — send password reset email
│   ├── login/route.ts                  # POST  — login, sets JWT cookie
│   ├── logout/route.ts                 # POST  — clears JWT cookie
│   ├── register/route.ts               # POST  — register new user
│   ├── resend-verification/route.ts    # POST  — resend email verification link
│   ├── reset-password/route.ts         # POST  — reset password via token
│   ├── status/route.ts                 # GET   — return current auth state (used by AuthContext)
│   └── verify-email/route.ts           # GET   — verify email address via token

├── countries/
│   ├── route.ts                        # GET (public) / POST — list or create countries
│   ├── counts/route.ts                 # GET — entity/entry counts per country
│   └── [countrycodePolpal]/route.ts    # GET / PATCH / DELETE — single country

├── datasets/
│   ├── route.ts                        # GET — list all datasets
│   ├── homepage/route.ts               # GET — datasets shown on the homepage
│   └── [datasetKey]/
│       ├── route.ts                    # GET / PATCH / DELETE — single dataset
│       └── versions/route.ts           # GET — versions belonging to a dataset

├── downloads/
│   ├── countries/stream/route.ts       # GET — stream countries as CSV
│   ├── entities/
│   │   ├── filters/route.ts            # GET — available filter options for entities download
│   │   └── stream/route.ts             # GET — stream entities as CSV (with filters)
│   ├── entity-names/
│   │   ├── filters/route.ts            # GET — available filter options for entity names download
│   │   └── stream/route.ts             # GET — stream entity names as CSV (with filters)
│   ├── entries/[versionKey]/
│   │   ├── filters/route.ts            # GET — available filter options for entries download
│   │   └── stream/route.ts             # GET — stream version entries as CSV (with filters)
│   ├── groupings/
│   │   ├── filters/route.ts            # GET — available filter options for groupings download
│   │   └── stream/route.ts             # GET — stream groupings as CSV (with filters)
│   ├── scripts/log/route.ts            # POST — log a script download event
│   └── versions-overview/stream/route.ts  # GET — stream versions overview as CSV

├── entities/
│   ├── route.ts                        # GET — list entities (paginated, filterable)
│   ├── commented-entities/route.ts     # GET — entities with comments (quality check)
│   ├── hidden-entities/route.ts        # GET — hidden entities (quality check)
│   ├── random-colors/route.ts          # GET — random selection of entities with colors
│   ├── random-logos/route.ts           # GET — random selection of entities with logos
│   ├── unassigned-entities/route.ts    # GET — entities not yet assigned to a version entry
│   ├── without-country/route.ts        # GET — entities not yet linked to a country
│   └── [polpalId]/
│       ├── route.ts                    # GET — single entity by PolPaL ID
│       ├── datasets/[datasetKey]/route.ts       # GET — datasets linked to an entity
│       ├── edit/route.ts                        # PATCH — update entity
│       └── versions/[versionKey]/route.ts       # GET — entity data for a specific version

├── entities-in-countries/
│   ├── route.ts                        # POST — create entity-in-country link
│   ├── countries/[polpalId]/route.ts   # GET — countries for an entity
│   ├── entities/
│   │   ├── [countrycodePolpal]/route.ts    # GET — entities in a country
│   │   └── info/
│   │       ├── [polpalId]/route.ts         # GET — detailed entity info
│   │       └── country/[countrycodePolpal]/route.ts  # GET — entity info filtered by country
│   ├── entities-member/[polpalId]/route.ts # GET — grouping members for an entity
│   ├── groupings/route.ts                  # GET — list all groupings
│   ├── groupings/[polpalId]/route.ts       # GET — groupings an entity belongs to
│   └── [entitiesInCountriesId]/route.ts    # GET / PATCH / DELETE — single link record

├── entity-changes/
│   ├── route.ts                        # GET / POST
│   └── [entityChangeId]/route.ts       # GET / PATCH / DELETE

├── entity-names/
│   ├── route.ts                        # GET / POST
│   └── [id]/route.ts                   # GET / PATCH / DELETE

├── entries/
│   ├── import/route.ts                 # POST — bulk CSV import (chunked, 1000 rows/chunk)
│   ├── sync/route.ts                   # POST — sync entries from external source
│   ├── unknown-entries/route.ts        # GET  — entries not yet linked to any entity
│   ├── by-entryId/[uniqueObservationId]/route.ts             # GET — single entry by uniqueObservationId
│   ├── by-version-and-country/[versionKey]/[countrycodePolpal]/route.ts              # GET — entries list
│   ├── by-version-and-country-aggregated/[versionKey]/[countrycodePolpal]/route.ts   # GET — aggregated
│   ├── countries/[versionKey]/route.ts # GET — countries present in a version
│   └── [versionKey]/
│       ├── route.ts                    # DELETE — delete all entries for a version
│       ├── entries/route.ts            # GET  — paginated entries for a version
│       └── [countrycodePolpal]/route.ts # GET — entries for a version + country

├── groupings/
│   ├── member/
│   │   ├── route.ts                    # POST — add a grouping member
│   │   └── [groupingMemberId]/route.ts # DELETE — remove a grouping member
│   ├── members/[groupingId]/route.ts   # GET — list members of a grouping
│   └── membership/[polpalId]/route.ts  # GET — groupings an entity is a member of

├── health/route.ts                     # GET — health check endpoint

├── internal/
│   ├── entities-by-year/route.ts       # GET — entity counts grouped by year (internal)
│   └── statistics/route.ts             # GET — internal statistics (not publicly documented)

├── links/
│   ├── route.ts                        # POST — create entry→entity link
│   ├── by-entries-polpal/route.ts      # POST — batch fetch links by entry + polpal ID pairs
│   ├── by-entry/[uniqueObservationId]/route.ts  # GET — links for a single entry
│   ├── by-entry-bulk/route.ts          # POST — batch fetch links for multiple entries
│   └── polpalId/[polpalId]/route.ts    # GET — all links for a PolPaL ID

├── news/
│   ├── route.ts                        # GET (all) / POST (create)
│   └── [newsId]/route.ts               # GET / PATCH / DELETE — single news item

├── projects/
│   ├── route.ts                        # GET (all) / POST (create)
│   └── [projectKey]/
│       ├── route.ts                    # GET / PATCH / DELETE — single project
│       └── datasets/route.ts           # GET — datasets belonging to a project

├── references/
│   ├── route.ts                        # GET — all references
│   ├── entities/[polpalId]/route.ts    # GET — references for an entity
│   └── [referenceId]/route.ts          # GET / PATCH / DELETE — single reference

├── report-tickets/
│   ├── route.ts                        # GET (all) / POST (create)
│   └── [ticketId]/route.ts             # GET / PATCH / DELETE — single ticket

├── routes.config.ts                    # Centralised route-level auth role configuration

├── users/[userId]/
│   ├── route.ts                        # GET / PATCH — user profile
│   ├── entities/route.ts               # GET — entities created by the user
│   ├── links/
│   │   ├── route.ts                    # GET — links created by the user
│   │   └── summary/route.ts            # GET — link activity summary for the user
│   ├── password-change/route.ts        # PATCH — change password
│   └── validated-links/
│       ├── route.ts                    # GET — links validated by the user
│       └── summary/route.ts            # GET — validation activity summary for the user

├── validate-email/route.ts             # POST — check if email is valid / not disposable
├── validate-links/
│   ├── route.ts                        # POST — validate entry→entity links
│   └── rejected-validations/route.ts   # GET  — list rejected validations (quality check)
├── validate-password/route.tsx         # POST — check password strength

├── versions/
│   ├── route.ts                        # GET (all) / POST (create)
│   ├── linking-overview/route.ts       # GET — linking statistics overview across versions
│   └── [versionKey]/
│       ├── route.ts                    # GET / PATCH / DELETE — single version
│       └── entries/route.ts            # GET — paginated entries for a version

├── wikidata-color/route.ts             # GET — fetch entity colour from Wikidata by QID
└── wikidata-logo/route.ts              # GET — fetch entity logo from Wikidata by QID
```

---

### Modules — `src/modules/`

Each domain has its own folder containing exactly two files:

- `*.schema.ts` — Zod schemas for request/response validation
- `*.service.ts` — Business logic functions (called by API routes; no direct HTTP concerns)

```
src/modules/
├── about/                  # About page content management
├── admin/                  # User approval, changelog queries, admin-scoped lists
├── authentication/         # Login, register, JWT generation/verification
├── countries/              # CRUD for countries
├── datasets/               # CRUD for datasets
├── downloads/              # CSV streaming logic (with filter support) + download log
├── entities/               # CRUD for political entities
├── entities-in-countries/  # Entity↔Country relationship management
├── entity-changes/         # Entity change history records
├── entity-names/           # Alternative/translated entity names
├── entries/                # Dataset entries (observations), bulk CSV import
├── groupings/              # Grouping/coalition membership
├── internal/               # Internal statistics
├── links/                  # Entry↔Entity links (uniqueObservationId → polpalId)
├── news/                   # News articles
├── projects/               # Research projects
├── references/             # Source references
├── report-tickets/         # User-submitted issue/report tickets
├── users/                  # User account management
├── validation/             # Link validation records
└── versions/               # Dataset versions
```

---

### Library — `src/lib/`

Shared utilities and singletons used across API routes and server components.

```
src/lib/
├── schemas/
│   └── api.schemas.ts        # Shared Zod schemas used across modules
├── server/                   # Server-only utilities — never imported by Client Components
│   ├── auth.server.ts        # getAuthPayload() and requireAuth() — JWT verification from cookie
│   ├── changelogLogger.ts    # Writes create/update/delete events to the changelog table
│   ├── email.server.ts       # Nodemailer helpers (send verification emails, etc.)
│   ├── logger.server.ts      # Pino JSON logger singleton
│   ├── prisma.server.ts      # Prisma client singleton (pg Pool, max 45 connections)
│   ├── rate-limit.server.ts  # rate-limiter-flexible instances + getClientIp()
│   ├── route-auth.server.ts  # Per-route auth enforcement helpers
│   └── security-events.server.ts  # Structured security event logging + sliding-window alerting
└── shared/                   # Safe for client and server import
    ├── commonPasswords.txt   # Blocklist of common passwords (used by validate-password API)
    ├── enums.ts              # Domain enums: EntityTypes, UserRoles, Languages, Regions, etc.
    ├── mapping.tsx           # Label/display mappings for enums (language, region names, etc.)
    └── utils.ts              # General utilities (e.g. cn() for class merging)
```

> **Important:** Files in `src/lib/server/` import `server-only` and must never be imported by Client Components. Shared, client-safe code lives in `src/lib/shared/`.

---

### Components — `src/components/`

Reusable React components shared across pages.

```
src/components/
├── admin/
│   └── AdminMasterDetail.tsx  # Master/detail layout used in admin list pages
├── layout/
│   ├── Header.tsx             # Top navigation bar (logo, nav links, auth state)
│   └── Footer.tsx             # Page footer
├── manage/
│   ├── ExistingReferencesTable.tsx  # Table of existing references in manage forms
│   └── NewReferenceFormRow.tsx      # Form row for adding a new reference
└── ui/                        # Low-level UI primitives (shadcn/Radix UI style)
    ├── AccessDenied.tsx
    ├── Breadcrumbs.tsx
    ├── Buttons.tsx             # Consolidated button variants
    ├── CountryBreadcrumbLinks.tsx
    ├── CountryCard.tsx
    ├── CountryEntityCard.tsx
    ├── DisplayFlags.tsx
    ├── EntityCard.tsx
    ├── EntityChangeCard.tsx
    ├── EntityDatasetCard.tsx
    ├── EntityDatasetFigure.tsx
    ├── EntityMemberCard.tsx
    ├── EntityNameCard.tsx
    ├── EntityTypeBadge.tsx
    ├── EntryCard.tsx
    ├── ErrorState.tsx
    ├── HomepageFigure.tsx
    ├── Input.tsx
    ├── Label.tsx
    ├── LoadingSpinner.tsx
    ├── NotFoundState.tsx
    ├── PaginationControls.tsx
    ├── RoleName.tsx
    ├── SearchInput.tsx
    ├── Select.tsx
    └── SourceList.tsx
```

---

### Context — `src/context/`

```
src/context/
└── AuthContext.tsx      # Provides { auth, loadingAuth, refreshAuth } to the whole app.
                         # Fetches /api/authentication/status on mount and after login/logout.
```

---

### Types — `src/types/`

```
src/types/
└── css.d.ts             # CSS module type declaration (allows importing *.module.css files)
```

---

## Database — `prisma/`

### Models

The Prisma schema is modular: the root `prisma/schema.prisma` declares the generator and datasource; all model definitions live in `prisma/models/` and are loaded via `prisma.config.ts`.

```
prisma/models/
├── about.prisma                  # About page content
├── changelog.prisma              # Audit log (table, action, record ID, userId, timestamp)
├── countries.prisma              # Countries (countrycodePolpal, countryname, region, ...)
├── datasets.prisma               # Datasets (belong to a project)
├── download-log.prisma           # Log of bulk download requests
├── entities.prisma               # Political entities (parties, coalitions, ...)
├── entities-in-countries.prisma  # Entity presence in a country (with date ranges)
├── entity-changes.prisma         # Changes to an entity over time (mergers, renames, etc.)
├── entity-names.prisma           # Alternative/translated names for an entity
├── entries.prisma                # Observations from a dataset version
├── grouping-members.prisma       # Members of a grouping/coalition
├── link-entries-entities.prisma  # Links: uniqueObservationId → polpalId
├── news.prisma                   # News articles
├── projects.prisma               # Research projects
├── rate-limit-tables.prisma      # rate-limiter-flexible persistence table
├── references.prisma             # Source references (DOI, URL, citation)
├── report-tickets.prisma         # User-submitted issue/report tickets
├── users.prisma                  # User accounts (role, approvedByAdmin, emailVerified, ...)
├── validation.prisma             # Link validation records
└── versions.prisma               # Versions of a dataset (versionKey, versionUrl, ...)
```

### Seed Data

```
prisma/seed/
├── seed.all.ts                        # Entry point — runs all seed scripts in order
├── seed.users.ts                      # Creates admin, datamanager, editor accounts
├── seed.countries.ts                  # Seeds countries from JSON fixtures
├── seed.entities.ts                   # Seeds political entities from JSON fixtures
├── seed.entities-in-countries.ts      # Seeds entity↔country links
└── fixtures/
    ├── PolPaL_initial_countries.json  # Country fixture data
    └── PolPaL_initial_entities.json   # Entity fixture data
```

---

## Public Assets — `public/`

```
public/
├── images/
│   ├── flags/          # Country flag images (referenced by DisplayFlags component)
│   └── logos/          # Entity logo images (referenced by EntityCard component)
└── Rscripts/           # R scripts for importing external datasets into PolPaL format
    │                   # Naming convention: {versionKey}.R
    ├── {versionKey}.R     # R script of external data version
    └── gatherScripts.R    # Helper script that aggregates all R scripts
```

---

## Configuration Files

| File | Purpose |
|---|---|
| `next.config.ts` | Next.js config: `output: 'standalone'`, security headers (X-Frame-Options, HSTS, Referrer-Policy, Permissions-Policy), 200 MB proxy body limit, 50 MB Server Actions body limit |
| `prisma.config.ts` | Prisma config: schema path (`prisma/`), migration path, seed command, loads `.env.local` or `.env.production.local` |
| `tailwind.config.ts` | Tailwind CSS theme customisation |
| `tsconfig.json` | TypeScript settings, path aliases (`@/` → `src/`) |
| `eslint.config.mjs` | ESLint rules for TypeScript + Next.js |
| `postcss.config.mjs` | PostCSS config (required for Tailwind) |
| `components.json` | shadcn/ui component configuration |
| `.dockerignore` | Files excluded from Docker build context |

---