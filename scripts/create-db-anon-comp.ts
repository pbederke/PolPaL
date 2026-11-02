/**
 * Generates an anonymized PostgreSQL dump of the production database.
 *
 * Reads  : DATABASE_URL from .env.production.local
 * Outputs: PolPaL_PostgreSQL_anon.sql  (written to repo root)
 *
 * Usage  : npm run db_anon
 *
 * Requirements:
 *   - pg_dump must be installed (ships with PostgreSQL client tools)
 *   - .env.production.local must contain DATABASE_URL
 *
 * Anonymization rules:
 *   - Users          : replaced with exactly 2 hardcoded rows (data-robot, admin)
 *   - userId columns : always replaced with 1 (data-robot), even if NULL
 *   - Comment fields : content replaced with 'anonymized comment' when present
 *   - Variables      : included for visible versions only; userId → 1
 *   - ValidationLinks, Changelog, report_tickets, download_logs, rate_limiter_* : schema included, no data
 */

import { execFileSync } from 'child_process';
import { createWriteStream, readFileSync } from 'fs';
import path from 'path';
import { Client } from 'pg';
import bcrypt from 'bcrypt';

// ---------------------------------------------------------------------------
// Load .env.production.local
// ---------------------------------------------------------------------------
function loadEnvFile(filePath: string): void {
  let content: string;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch {
    console.error(`Error: Could not read ${filePath}`);
    process.exit(1);
  }
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile(path.resolve(process.cwd(), '.env.production.local'));

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Error: DATABASE_URL not found in .env.production.local');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Parse connection URL for pg_dump flags
// ---------------------------------------------------------------------------
const dbUrl = new URL(DATABASE_URL);
const dbHost = dbUrl.hostname;
const dbPort = dbUrl.port || '5432';
const dbUser = dbUrl.username;
const dbPassword = decodeURIComponent(dbUrl.password);
const dbName = dbUrl.pathname.slice(1); // strip leading "/"

// ---------------------------------------------------------------------------
// SQL formatting helpers
// ---------------------------------------------------------------------------
function escStr(s: string): string {
  return "'" + s.replace(/'/g, "''") + "'";
}

function fmtVal(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'bigint') return String(v);
  if (typeof v === 'number') return String(v);
  if (v instanceof Date) return escStr(v.toISOString());
  if (typeof v === 'object') return escStr(JSON.stringify(v)) + '::jsonb';
  return escStr(String(v));
}

function toInserts(table: string, rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const cols = Object.keys(rows[0]);
  const colList = cols.map((c) => `"${c}"`).join(', ');
  return rows
    .map((row) => {
      const vals = cols.map((c) => fmtVal(row[c])).join(', ');
      return `INSERT INTO "${table}" (${colList}) VALUES (${vals});`;
    })
    .join('\n') + '\n';
}

// Replace any userId with 1 (data-robot) and anonymize comment fields
function anonymizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (key === 'userId') {
      out[key] = 1;
    } else if (/^comment/i.test(key) && value !== null && value !== undefined && value !== '') {
      out[key] = 'anonymized comment';
    } else {
      out[key] = value;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  // -------------------------------------------------------------------------
  // Compute bcrypt hashes (12 rounds — matches seed.users.ts)
  // -------------------------------------------------------------------------
  console.log('Computing bcrypt hashes (12 rounds — takes ~5s)...');
  const robotPasswordHash = await bcrypt.hash('robot', 12);
  const adminPasswordHash = await bcrypt.hash('admin', 12);
  const datamanagerPasswordHash = await bcrypt.hash('datamanager', 12);
  const editorPasswordHash = await bcrypt.hash('editor', 12);
  const contributorPasswordHash = await bcrypt.hash('contributor', 12);
  const userPasswordHash = await bcrypt.hash('user', 12);

  // -------------------------------------------------------------------------
  // Export schema via pg_dump --schema-only
  // -------------------------------------------------------------------------
  console.log(`PolPaL Anonymized Database Dump (Complete)`);
  console.log('Exporting schema via pg_dump...');
  let schemaSql: string;
  try {
    schemaSql = execFileSync(
      'pg_dump',
      [
        '--schema-only',
        '--no-owner',
        '--no-acl',
        '-h', dbHost,
        '-p', dbPort,
        '-U', dbUser,
        '-d', dbName,
      ],
      {
        env: { ...process.env, PGPASSWORD: dbPassword },
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024,
      }
    );
  } catch (err) {
    console.error(
      'Error: pg_dump failed. Make sure PostgreSQL client tools are installed and in PATH.'
    );
    console.error(err);
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // Connect to production DB for data queries
  // -------------------------------------------------------------------------
  const client = new Client({ connectionString: DATABASE_URL as string });
  await client.connect();

  const outputFile = path.resolve(process.cwd(), `PolPaL_PostgreSQL_anon_comp.sql`);
  const outputStream = createWriteStream(outputFile, { encoding: 'utf8' });
  let writeError: Error | null = null;
  outputStream.on('error', (err) => {
    writeError = err;
  });
  const write = (text: string): Promise<void> =>
    new Promise((resolve, reject) => {
      if (writeError) return reject(writeError);
      if (outputStream.write(text)) return resolve();
      outputStream.once('drain', () => (writeError ? reject(writeError) : resolve()));
    });
  const closeStream = (): Promise<void> =>
    new Promise((resolve, reject) => {
      outputStream.once('close', () => (writeError ? reject(writeError) : resolve()));
      outputStream.end();
    });

  // -------------------------------------------------------------------------
  // Header
  // -------------------------------------------------------------------------
  await write(`-- PolPaL Anonymized Database Dump (Complete)\n`);
  await write(`-- Generated : ${new Date().toISOString()}\n`);
  await write(`-- Source    : ${dbHost}/${dbName}\n`);
  await write(`-- Note      : PII has been removed or replaced. See scripts/anonymize-db.ts.\n`);
  await write(`\n`);

  // -------------------------------------------------------------------------
  // Schema DDL (from pg_dump)
  // -------------------------------------------------------------------------
  await write(schemaSql);
  await write(`\n`);

  // -------------------------------------------------------------------------
  // Data section
  // -------------------------------------------------------------------------
  await write(`-- ============================================================\n`);
  await write(`-- ANONYMIZED DATA\n`);
  await write(`-- ============================================================\n\n`);

  // Disable FK trigger checks so tables can be loaded in any order
  await write(`SET search_path = public;\n`);
  await write(`SET session_replication_role = 'replica';\n\n`);

  async function dumpTable(
    table: string,
    orderCol: string,
    transform?: (row: Record<string, unknown>) => Record<string, unknown>,
    whereClause?: string
  ): Promise<void> {
    process.stdout.write(`  Dumping "${table}"... `);
    const where = whereClause ? ` WHERE ${whereClause}` : '';
    const { rows } = await client.query<Record<string, unknown>>(
      `SELECT * FROM "${table}"${where} ORDER BY "${orderCol}"`
    );
    process.stdout.write(`${rows.length} rows\n`);
    await write(`-- ${table} (${rows.length} rows)\n`);
    if (rows.length > 0) {
      const prepared = transform ? rows.map(transform) : rows;
      const batchSize = 1000;
      for (let i = 0; i < prepared.length; i += batchSize) {
        await write(toInserts(table, prepared.slice(i, i + batchSize)));
      }
    }
    await write(`\n`);
  }

  console.log('\nDumping tables...');

  // 1. Countries — userId → 1
  await dumpTable('Countries', 'countryId', anonymizeRow);

  // 2. Users — replace with exactly 6 hardcoded rows (not read from production)
  console.log('  Writing hardcoded Users (6 rows)');
  const now = new Date();
  const hardcodedUsers: Record<string, unknown>[] = [
    {
      userId: 1,
      nameFirst: 'PolPaL',
      nameLast: 'Robot',
      email: 'robot@example.com',
      username: 'robot',
      password: robotPasswordHash,
      emailVerified: true,
      emailVerifyToken: null,
      emailVerifyExpiresAt: null,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
      approvedByAdmin: true,
      role: 'ROBOT',
      tokenVersion: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: 2,
      nameFirst: 'PolPaL',
      nameLast: 'Admin',
      email: 'admin@example.com',
      username: 'admin',
      password: adminPasswordHash,
      emailVerified: true,
      emailVerifyToken: null,
      emailVerifyExpiresAt: null,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
      approvedByAdmin: true,
      role: 'ADMIN',
      tokenVersion: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: 3,
      nameFirst: 'PolPaL',
      nameLast: 'Data Manager',
      email: 'datamanager@example.com',
      username: 'datamanager',
      password: datamanagerPasswordHash,
      emailVerified: true,
      emailVerifyToken: null,
      emailVerifyExpiresAt: null,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
      approvedByAdmin: true,
      role: 'DATAMANAGER',
      tokenVersion: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: 4,
      nameFirst: 'PolPaL',
      nameLast: 'Editor',
      email: 'editor@example.com',
      username: 'editor',
      password: editorPasswordHash,
      emailVerified: true,
      emailVerifyToken: null,
      emailVerifyExpiresAt: null,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
      approvedByAdmin: true,
      role: 'EDITOR',
      tokenVersion: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: 5,
      nameFirst: 'PolPaL',
      nameLast: 'Contributor',
      email: 'contributor@example.com',
      username: 'contributor',
      password: contributorPasswordHash,
      emailVerified: true,
      emailVerifyToken: null,
      emailVerifyExpiresAt: null,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
      approvedByAdmin: true,
      role: 'CONTRIBUTOR',
      tokenVersion: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: 6,
      nameFirst: 'PolPaL',
      nameLast: 'User',
      email: 'user@example.com',
      username: 'user',
      password: userPasswordHash,
      emailVerified: true,
      emailVerifyToken: null,
      emailVerifyExpiresAt: null,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
      approvedByAdmin: true,
      role: 'USER',
      tokenVersion: 0,
      createdAt: now,
      updatedAt: now,
    },
  ];
  await write(`-- Users (6 hardcoded rows)\n`);
  await write(toInserts('Users', hardcodedUsers));
  await write(`\n`);
  // 3. Entities — userId → 1
  await dumpTable('Entities', 'polpalId', anonymizeRow);

  // 4. Projects — visible only (isHidden = false); userId → 1
  await dumpTable('Projects', 'projectId', anonymizeRow);

  // 5. Datasets — visible only; parent project must also be visible; userId → 1
  await dumpTable('Datasets', 'datasetId', anonymizeRow);

  // 6. Versions — visible only; parent dataset+project must also be visible; userId → 1
  await dumpTable('Versions', 'versionId', anonymizeRow);

  // 7. Entries — only if parent version is visible; userId → 1
  await dumpTable('Entries', 'entryId', anonymizeRow);

  // 8. EntityNames — userId → 1
  await dumpTable('EntityNames', 'entityNameId', anonymizeRow);

  // 9. EntityChanges — userId → 1
  await dumpTable('EntityChanges', 'entityChangeId', anonymizeRow);

  // 10. EntitiesInCountries — userId → 1
  await dumpTable('EntitiesInCountries', 'entityInCountryId', anonymizeRow);

  // 11. GroupingMembers — userId → 1
  await dumpTable('GroupingMembers', 'groupingMemberId', anonymizeRow);

  // 12. References — userId → 1 (after all referenced tables)
  await dumpTable('References', 'referenceId', anonymizeRow);

  // 13. LinksEntryToEntity — only if parent entry is included; userId → 1
  await dumpTable('LinksEntryToEntity', 'linkEntriesToEntityId', anonymizeRow);

  // 14. Variables — only for visible versions; userId → 1
  await dumpTable('Variables', 'variableId', anonymizeRow);

  // 15. News — userId → 1
  await dumpTable('News', 'newsId', anonymizeRow);

  // 16. About — no userId column
  await dumpTable('About', 'id', anonymizeRow);

  // Emptied tables — schema present but no data inserted
  for (const t of [
    'ValidationLinks',
    'Changelog',
    'report_tickets',
    'download_logs',
    'rate_limiter_login',
    'rate_limiter_register',
    'rate_limiter_download',
    'rate_limiter_password_reset',
  ]) {
    console.log(`  Skipping "${t}" (emptied)`);
    await write(`-- ${t} (emptied — no data inserted)\n\n`);
  }

  // Re-enable FK triggers
  await write(`SET session_replication_role = DEFAULT;\n\n`);

  // -------------------------------------------------------------------------
  // Sequence resets
  // Reset each SERIAL sequence to the current max ID so auto-increment works
  // correctly after restoring the dump.
  // -------------------------------------------------------------------------
  await write(`-- ============================================================\n`);
  await write(`-- SEQUENCE RESETS\n`);
  await write(`-- ============================================================\n\n`);

  const sequencedTables: [table: string, pk: string][] = [
    ['Countries', 'countryId'],
    ['Users', 'userId'],
    ['Entities', 'polpalId'],
    ['Projects', 'projectId'],
    ['Datasets', 'datasetId'],
    ['Versions', 'versionId'],
    ['Entries', 'entryId'],
    ['EntityNames', 'entityNameId'],
    ['EntityChanges', 'entityChangeId'],
    ['EntitiesInCountries', 'entityInCountryId'],
    ['GroupingMembers', 'groupingMemberId'],
    ['References', 'referenceId'],
    ['LinksEntryToEntity', 'linkEntriesToEntityId'],
    ['Variables', 'variableId'],
    ['ValidationLinks', 'validationId'],
    ['News', 'newsId'],
    ['About', 'id'],
    ['report_tickets', 'id'],
    ['Changelog', 'changelogId'],
    ['download_logs', 'id'],
  ];

  for (const [table, pk] of sequencedTables) {
    await write(
      `SELECT setval(pg_get_serial_sequence('"${table}"', '${pk}'), ` +
      `COALESCE((SELECT MAX("${pk}") FROM "${table}"), 1));\n`
    );
  }

  // -------------------------------------------------------------------------
  // Close connection and finish the output stream
  // -------------------------------------------------------------------------
  await client.end();
  await closeStream();

  console.log(`\nDone! Wrote: ${outputFile}`);
  console.log(`\nTo restore:`);
  console.log(`  createdb <dbname>`);
  console.log(`  psql <dbname> < PolPaL_PostgreSQL_anon_comp.sql`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
