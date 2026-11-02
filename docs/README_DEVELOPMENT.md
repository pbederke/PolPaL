# PolPaL — Development Guide

This guide walks you through the developing steps of the PolPaL application on your local machine.

---

## Prerequisites

PolPaL should run locally in Docker containers.

> See [README_INITIAL_SETUP](README_INITIAL_SETUP.md) for intital setup.

Install npm packages (required for host-side commands such as `npm run dev`, `npm run lint`, and `npm run generate`):

```bash
npm ci
```

`.env.production.local` with the PostgreSQL database connection URI is need.

```bash
# Production Database URL
DATABASE_URL="[connection URI]"
```

> __Be aware, `.env.production.local` contains the connection URI to the production database. NEVER commit `.env.production.local` to GitHub!__

## General Steps

1. Update codebase in [Local Development Environment](#step-a-local-development-environment)
2. Test changes in [Local Production Environment](#step-b-local-production-environment)
3. Commit and push changes to [GitHub](#step-c-commit-and-push-to-github)


## Development

For the technical development of the PolPaL application, we distingush between local development environment and local production environment.

### Step A: Local Development Environment

Use this approach to run Next.js directly on your machine. The PostgreSQL database still runs in Docker, but the Next.js dev server runs on your host — giving you faster hot-reload and direct access to local tooling.

#### A1. Start the database container (if not already running)

Start only the PostgreSQL service from Docker Compose (no need to build or start the web container):

```bash
npm run docker:up_db
```

This starts `polpal-postgres-db` (PostgreSQL 16) and exposes it on port **5433**.

#### A2. Start the development server

```bash
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000) with Turbopack hot-reload.

#### A3. Update codebase

Edit source files under `src/`. The dev server reloads automatically on save.

If you modify the Prisma schema, see [Changing the data model](#changing-the-data-model-prisma-schemamigration).

#### A4. Run linter and build check

Before moving to the production environment, verify there are no lint errors or type errors:

```bash
npm run lint
npm run build
```

#### Tear down

```bash
# Stop only the development server
ctrl + c

# Stop and remove the container (data is preserved in the named volume)
npm run docker:down_all

# Stop and delete everything INCLUDING the database data
npm run docker:delete
```

---

### Step B: Local Production Environment

Use this approach to run Next.js and the PostgreSQL database in Docker. This simulates the production environment.

#### B1. Start the app and database container

Start the Next.js and the PostgreSQL service from Docker Compose:

```bash
npm run docker:up
```

This starts the `polpal-web` container (Next.js, exposed on port **3000**) and `polpal-postgres-db` container (PostgreSQL 16, exposed on port **5433**).

#### B2. Verify the app

Open [http://localhost:3000](http://localhost:3000) and confirm your changes work as expected in the production build.

#### B3. Check container logs (optional)

If something is not working, inspect the container output:

```bash
docker logs polpal-web --tail 50
```

> If changes are needed, return to [Step A](#step-a-local-development-environment).

#### Tear down

```bash
# Stop only the web container (keeps the database)
npm run docker:down

# Stop and remove everything (data is preserved in the named volume)
npm run docker:down_all

# Stop and delete everything INCLUDING the database data
npm run docker:delete
```

---

### Step C: Commit and push to GitHub

Once you have verified your changes locally ([Step A](#step-a-local-development-environment) & [Step B](#step-b-local-production-environment)), commit and push them to GitHub.

#### C1. Stage your changes

```bash
# Stage all changes
git add .

# Or stage specific files
git add src/path/to/file.ts
```

#### C2. Commit

```bash
git commit -m "short description of your change"
```

#### C3. Push to GitHub

```bash
git push
```

#### Alternatively

Use a GUI client of your preference (e.g. GitHub Desktop, VS Code Source Control panel).

---

## Changing the data model (Prisma schema/migration)

If changes to the data model are required, see [README_PRISMA_MIGRATION.md](README_PRISMA_MIGRATION.md).

---

## Authentication & Authorization

For the full authentication and authorization guide, see [README_AUTHENTICATION.md](README_AUTHENTICATION.md).

---

## Useful commands

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Create a production build |
| `npm run lint` | Run ESLint |
| `npm run studio` | Open the Prisma GUI database browser |
| `npm run docker:up` | Build and start Docker containers |
| `npm run docker:up_db` | Build and start database Docker container |
| `npm run docker:down` | Stop the frontend container |
| `npm run docker:down_all` | Stop all container |
| `npm run docker:delete` | Stop and delete all container |

---

## Troubleshooting

**Prisma client is out of date**
- Run `npm run generate` after any change to files under `prisma/models/`.

**Email not sending (production only)**
- In development (`npm run dev`) emails are never sent — they are printed to the terminal. No SMTP config is needed.
- In production (NOT local production environment), check that `SMTP_*` and `EMAIL_FROM` variables are correctly set on the hosting service.

**Port 5433 already in use**
- Another PostgreSQL instance may be running. Change the host port in `compose.yaml` (`"5434:5432"`) and update `DATABASE_URL` accordingly.
