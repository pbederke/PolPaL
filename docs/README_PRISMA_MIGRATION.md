# PolPaL — Prisma Migration Guide

Step-by-step rules for making schema changes safely in development and production.

---

## Overview

| Environment | Tool | Command |
|---|---|---|
| Development | `prisma migrate dev` | `npm run migrate` |
| Production | `prisma migrate deploy` | `npm run migrate:deploy` |

**Never** run `migrate dev` against a production database. It can prompt for resets and drops data.

---

## Schema Files

Models are split across `prisma/models/*.prisma`. The root `prisma/schema.prisma` is the entry point. `prisma.config.ts` points Prisma at the `prisma/` folder as the schema directory.

- One model per file under `prisma/models/`
- After any `.prisma` edit, always regenerate the client before anything else

---

## Workflow

### Prerequisites

- `DATABASE_URL` in `.env.production.local` must point to the production PostgreSQL instance (NOT Docker PostgreSQL instance)
- **Back up the database** before applying any migration

### 1. Edit the schema

Make changes in the relevant `prisma/models/*.prisma` file.  
Keep changes focused — one logical change per migration.

### 2. Regenerate the Prisma client

```bash
npm run generate
# or: npx prisma generate
```

This updates the TypeScript types. Do this before touching service code so your IDE can validate queries.

### 3. Create and apply the migration

```bash
npm run migrate
# or: npx prisma migrate dev
```

Prisma will:
- Diff your schema against the current database state
- Generate a SQL migration file in `prisma/migrations/<timestamp>_<name>/migration.sql`
- Apply it to your local database
- Re-run `prisma generate` automatically

When prompted for a migration name, use a short snake_case description of the change (e.g. `add_entity_type_column`, `rename_project_key`).

### 4. Review the generated SQL

Open `prisma/migrations/<timestamp>/migration.sql` and verify it does exactly what you expect — especially for:
- Column renames (Prisma may generate a DROP + ADD instead of RENAME)
- `NOT NULL` additions on existing tables (need a default or backfill)
- Index or constraint changes

### 5. Update service code and run the app

```bash
npm run dev
```

Fix any TypeScript errors introduced by the schema change before committing.

Confirm `prisma/migrations/` contains the new migration folder.

### 6. Test service code in local production environment

```bash
npm run docker:up
```

Test the implemented changes and revise if necessary.

### 3. Apply pending migrations to production DB

If the local production environment is running without issues, apply the pending migration to the production DB.

```bash
npm run migrate:deploy
# npx prisma migrate deploy
```

`migrate deploy` only applies migrations that have not yet been applied. It never prompts, never resets, and never generates new migrations — safe for automation.

### 6. Commit everything together

Always commit these files as a single atomic commit:

```
prisma/models/<changed-file>.prisma
prisma/migrations/<new-migration>/migration.sql
prisma/migrations/migration_lock.toml   # only if it changed
src/modules/<domain>/<domain>.service.ts
```

Never commit a migration without the schema change that produced it, and vice versa.

The pushed commit will automatically restart the application.

---

## Dangerous Operations — Checklist Before Running

These operations are **destructive** and require extra caution:

| Operation | Risk | Mitigation |
|---|---|---|
| Dropping a column | Permanent data loss | Back up first; verify no code references it |
| Renaming a column | Prisma generates DROP + ADD by default | Edit the migration SQL to use `ALTER TABLE ... RENAME COLUMN` instead |
| Adding `NOT NULL` to existing column | Fails if rows have nulls | Add a `DEFAULT` or run a backfill migration first |
| `prisma migrate reset` | Drops and recreates the entire database | Development only; never run in production |
| Changing a relation | May cascade-delete rows | Check `onDelete` behaviour in the schema |

### How to safely rename a column

1. Run `npm run migrate` to generate the migration file.
2. Open `prisma/migrations/<timestamp>/migration.sql`.
3. Replace the generated DROP + ADD statements with:
   ```sql
   ALTER TABLE "TableName" RENAME COLUMN "oldName" TO "newName";
   ```
4. Apply with `npm run migrate:deploy` (production) or by re-running `migrate dev --skip-generate` (development, after manual SQL edit).

---

## Resolving a Failed Migration

If a migration fails partway through (e.g. a constraint violation):

1. Fix the root cause (backfill data, adjust the SQL, etc.)
2. Mark the failed migration as rolled back:
   ```bash
   npx prisma migrate resolve --rolled-back "<migration_name>"
   ```
3. Correct the migration SQL or create a new fix migration.
4. Re-apply:
   ```bash
   npm run migrate:deploy
   ```

---

## Useful commands

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Create a production build |
| `npm run lint` | Run ESLint |
| `npm run studio` | Open the Prisma GUI database browser |
| `npm run migrate` | Create and apply a new Prisma migration (locally) |
| `npm run migrate:deploy` | Apply a new Prisma migration to production DB |
| `npm run docker:up` | Build and start Docker containers |
| `npm run docker:up_db` | Build and start database Docker container |
| `npm run docker:down` | Stop the frontend container |
| `npm run docker:down_all` | Stop all container |
| `npm run docker:delete` | Stop and delete all container |