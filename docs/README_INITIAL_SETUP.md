# PolPaL — Initial Setup Guide

This guide walks you through setting up a local version of the PolPaL application as an instance running with Docker and pre-seeded data.

> **All commands in this guide must be run from the project root directory** (the folder containing `package.json`, `compose.yaml`, and `Dockerfile`), e.g. `C:\Users\you\PolPaL_test` on Windows or `~/PolPaL_test` on macOS/Linux.

---

## Prerequisites

- **Node.js 24** (matches the Docker image; earlier versions may work but are untested)
- **npm** (bundled with Node.js)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — used to run the PostgreSQL database container

---

## 1. Download the latest release from GitHub

Download the latest release of PolPaL from the GitHub repository (`Source code` folder & `PolPaL_PostgreSQL_anon.sql`).

> [github.com/pbederke/PolPaL_test/releases](https://github.com/pbederke/PolPaL_test/releases)

Unpack the zipped `Source code` folder and copy the `PolPaL_PostgreSQL_anon.sql` into the root folder of the PolPaL project.

### For PolPaL Developers

Clone the PolPaL GitHub repository and add the SQL dump (`PolPaL_PostgreSQL_anon.sql`) to the root of the repository.

```bash
git clone https://github.com/pbederke/PolPaL_test.git
cd PolPaL_test
```

> Replace `vX.X.X` with the latest release tag.

```bash
curl -L https://github.com/pbederke/PolPaL_test/releases/download/vX.X.X/PolPaL_PostgreSQL_anon.sql \
  -o PolPaL_PostgreSQL_anon.sql
```

---

## 2. Create your environment file

Create the local env file `.env.local` and set each variable:

| Variable | Description | Example / Notes |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5433/polpal` |
| `KEY_ENCRYPTION` | Secret used to sign JWTs — must be long and random | Generate in Git Bash with: `openssl rand -hex 32` |

> `.env.local` is git-ignored and must never be committed.

---

## 3. Set up database

### 3a. Place `PolPaL_PostgreSQL_anon.sql` in the project root

The SQL dump must be present in the project root before starting the stack. If you downloaded it manually in step 1, it is already there — skip ahead to step 3b.

Otherwise, fetch it directly from the latest GitHub release:

```bash
curl -L https://github.com/pbederke/PolPaL_test/releases/download/vX.X.X/PolPaL_PostgreSQL_anon.sql \
  -o PolPaL_PostgreSQL_anon.sql
```

> Replace `vX.X.X` with the latest release tag.

### 3b. Start the stack

Start the app and database in Docker containers.

```bash
npm run docker:up
# equivalent to: docker compose up -d --build
```

This will:
1. Build the Next.js app image (multi-stage, Node 24 Alpine)
2. Start the `polpal-web` container (Next.js, exposed on port **3000**)
3. Start the `polpal-postgres-db` container (PostgreSQL 17, exposed on port **5433**)
4. Initialize the database from `PolPaL_PostgreSQL_anon.sql` on first start

### 3c. Wait for the database to initialize

On first start, the database is automatically seeded from `PolPaL_PostgreSQL_anon.sql`. This includes the full schema, all data, and two pre-configured user accounts. No manual migration or seed commands are needed.

You can follow the initialization progress:

```bash
docker logs polpal-postgres-db -f
```

The database is ready when the logs show `database system is ready to accept connections`.

> Please be aware, the initial seeding of the database can take a while (~10min).

### 3d. Open the app

Navigate to [http://localhost:3000](http://localhost:3000).

### Tear down

```bash
# Stop only the web container (keeps the database)
npm run docker:down

# Stop and remove everything (data is preserved in the named volume)
npm run docker:down_all

# Stop and delete everything INCLUDING the database data (re-seeding required afterwards)
npm run docker:delete
```

---

## 4. First login

After seeding, log in with the admin account:

- **URL**: [http://localhost:3000/authentication/login](http://localhost:3000/authentication/login)
- **Username**: `admin`
- **Password**: `admin`

You should have full access to the local version of PolPaL.

> **Email:** SMTP variables (`SMTP_*`, `EMAIL_FROM`) are not set locally. During `npm run dev` all outgoing emails are printed to the terminal instead of being sent. When running via Docker, no emails are sent or logged at all — new users must therefore be created through the **Admin interface** rather than via self-registration. See [README_DEVELOPMENT.md](README_DEVELOPMENT.md) for details on the local development environment required for `npm run dev`.

---

## Mock-Up Accounts

| Username | Password| Role |
|---|---|---|
| admin | admin | ADMIN |
| datamanager | datamanager | DATAMANAGER |
| editor | editor | EDITOR |
| contributor | contributor | CONTRIBUTOR |
| user | user | USER |

---

## Useful commands

| Command | Description |
|---|---|
| `npm run docker:up` | Build and start Docker containers |
| `npm run docker:up_db` | Build and start database Docker container |
| `npm run docker:down` | Stop the frontend container |
| `npm run docker:down_all` | Stop all containers |
| `npm run docker:delete` | Stop and delete all containers |

---

## Troubleshooting

**`PrismaClientInitializationError` / cannot connect to database**
- Verify `DATABASE_URL` in `.env.local` is correct and the database is running.
- For Docker, confirm `polpal-postgres-db` is healthy: `docker ps`.

**Migrations fail with "relation already exists"**
- The database has stale tables from a previous run. Either drop and recreate the database, or use `npx prisma migrate resolve` to mark migrations as applied.

**Missing tables or corrupted database state**
- Wipe the volume and let the container re-initialize from the SQL dump: `npm run docker:delete` followed by `npm run docker:up`.

**Port 5433 already in use**
- Another PostgreSQL instance may be running. Change the host port in `compose.yaml` (`"5434:5432"`) and update `DATABASE_URL` accordingly.
