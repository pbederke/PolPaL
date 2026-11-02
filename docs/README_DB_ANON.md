# PolPaL — Anonymized Database Dump

This document explains the purpose, anonymization rules, and process for generating `PolPaL_PostgreSQL_anon.sql` — the anonymized database dump that is at the root of the repository and is used to seed the local Docker development environment.

---

## Purpose

The dump provides a complete, realistic dataset (entities, countries, projects, datasets, versions, entries, links, etc.) for local development without exposing any personal data from the production database. It is committed to the repository and automatically imported by the PostgreSQL Docker container on first start.

---

## Anonymization Rules

The script applies the following rules per table. The source is [`scripts/create-db-anon.ts`](../scripts/create-db-anon.ts).

| Table | Rule |
|---|---|
| `Countries` | Exported as-is; `userId` always replaced with `1` |
| `Users` | **Replaced entirely** with 2 hardcoded rows (see below) |
| `Entities` | Exported as-is; `userId` always replaced with `1` |
| `EntityNames` | Exported as-is; `userId` always replaced with `1` |
| `EntityChanges` | Exported as-is; `userId` always replaced with `1` |
| `EntitiesInCountries` | Exported as-is; `userId` always replaced with `1` |
| `GroupingMembers` | Exported as-is; `userId` always replaced with `1` |
| `References` | Exported as-is; `userId` always replaced with `1` |
| `Projects` | Visible only (`isHidden = false`); `userId` always replaced with `1` |
| `Datasets` | Visible only; parent project must also be visible; `userId` always replaced with `1` |
| `Versions` | Visible only; parent dataset+project must also be visible; `userId` always replaced with `1` |
| `Entries` | Only if parent version is visible; `userId` always replaced with `1` |
| `LinksEntryToEntity` | Only if parent entry is included; `userId` always replaced with `1` |
| `ValidationLinks` | Schema included, **no data** |
| `News` | Exported as-is; `userId` always replaced with `1` |
| `About` | Exported as-is — no `userId` column |
| `report_tickets` | Schema included, **no data** (titles/descriptions may contain PII) |
| `Changelog` | Schema included, **no data** |
| `download_logs` | Schema included, **no data** |
| `rate_limiter_*` | Schema included, **no data** |

### Hardcoded Users

All production user rows are discarded and replaced with exactly six accounts:

| `userId` | `username` | `role` | `password` |
|---|---|---|---|
| `1` | `data-robot` | `ROBOT` | `robot` |
| `2` | `admin` | `ADMIN` | `admin` |
| `3` | `datamanager` | `DATAMANAGER` | `datamanager` |
| `4` | `editor` | `EDITOR` | `editor` |
| `5` | `contributor` | `CONTRIBUTOR` | `contributor` |
| `6` | `user` | `USER` | `user` |

Both accounts are `emailVerified: true` and `approvedByAdmin: true`. All `userId` foreign keys in other tables are always set to `1` (data-robot), including rows where `userId` was `NULL`.

### Sequence Resets

After all data is inserted, every `SERIAL` sequence is reset to `MAX(pk)` so that new rows created after restoring the dump do not collide with existing IDs.

---

## Requirements

- **`pg_dump`** must be installed and on `PATH` (ships with PostgreSQL client tools)
- **`.env.production.local`** must exist at the repo root and contain `DATABASE_URL` pointing at the production database

---

## Generating a New Dump

```bash
npm run db_anon
# equivalent to: tsx scripts/create-db-anon.ts
```

The script:
1. Runs `pg_dump --schema-only` against the production database to capture the full DDL
2. Connects to the production database via `pg` to query and transform each table
3. Applies the anonymization rules described above
4. Writes the result to `PolPaL_PostgreSQL_anon.sql` in the repo root

> Bcrypt hashing (12 rounds) for the six hardcoded user passwords adds ~5 seconds to the runtime.

---

## Restoring the Dump

The dump is restored automatically by the Docker container on first build (see [`docs/README_INITIAL_SETUP.md`](README_INITIAL_SETUP.md)). To restore it manually:

```bash
createdb <dbname>
psql <dbname> < PolPaL_PostgreSQL_anon.sql
```
