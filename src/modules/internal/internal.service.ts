import 'server-only';
import { prisma } from "@/lib/server/prisma.server";

// Stats — single raw query with 120-second in-memory cache
interface StatsResult {
  countriesCount: number;
  allCount: number;
  projectsCount: number;
  datasetsCount: number;
  versionsCount: number;
  entriesCount: number;
  linksCount: number;
  // Total counts (including hidden) — for anonymous "reveal all" feature
  totalProjectsCount: number;
  totalDatasetsCount: number;
  totalVersionsCount: number;
  totalEntriesCount: number;
}

type StatsCache = { data: StatsResult; expiry: number } | null;
const STATS_CACHE_TTL_MS = 120_000; // 120 seconds

// E-006: manual TTL cache retained; unstable_cache deprecated in Next 16 and single-container deployment makes migration unnecessary (see AUDIT_REPORT.md E-006)
let statsCachePublic: StatsCache = null;
// E-006: manual TTL cache retained; unstable_cache deprecated in Next 16 and single-container deployment makes migration unnecessary (see AUDIT_REPORT.md E-006)
let statsCacheAuth: StatsCache = null;

export async function getStats(isLoggedIn: boolean): Promise<StatsResult> {
  const cache = isLoggedIn ? statsCacheAuth : statsCachePublic;
  if (cache && Date.now() < cache.expiry) {
    return cache.data;
  }

  type RawRow = {
    countriesCount: bigint;
    allCount: bigint;
    projectsCount: bigint;
    datasetsCount: bigint;
    versionsCount: bigint;
    entriesCount: bigint;
    linksCount: bigint;
    totalProjectsCount: bigint;
    totalDatasetsCount: bigint;
    totalVersionsCount: bigint;
    totalEntriesCount: bigint;
  };

  let row: RawRow;

  if (isLoggedIn) {
    // Logged-in users: full counts, but entities/countries still filter non-hidden entities
    [row] = await prisma.$queryRaw<RawRow[]>`
      SELECT
        (SELECT COUNT(*) FROM "Countries" c
          WHERE EXISTS (SELECT 1 FROM "EntitiesInCountries" ec
                          JOIN "Entities" e ON e."polpalId" = ec."polpalId"
                         WHERE ec."countrycodePolpal" = c."countrycodePolpal"
                           AND e."isHidden" = false
                           AND e."entityType" IN ('PARTY', 'GROUPING', 'UNASSIGNED'))
        ) AS "countriesCount",
        (SELECT COUNT(*) FROM "Entities"    WHERE "isHidden" = false AND "entityType" IN ('PARTY', 'GROUPING', 'UNASSIGNED'))  AS "allCount",
        (SELECT COUNT(*) FROM "Projects")                           AS "projectsCount",
        (SELECT COUNT(*) FROM "Datasets")                           AS "datasetsCount",
        (SELECT COUNT(*) FROM "Versions")                           AS "versionsCount",
        (SELECT COUNT(*) FROM "Entries")                            AS "entriesCount",
        (SELECT COUNT(*) FROM "LinksEntryToEntity")                 AS "linksCount",
        (SELECT COUNT(*) FROM "Projects")                           AS "totalProjectsCount",
        (SELECT COUNT(*) FROM "Datasets")                           AS "totalDatasetsCount",
        (SELECT COUNT(*) FROM "Versions")                           AS "totalVersionsCount",
        (SELECT COUNT(*) FROM "Entries")                            AS "totalEntriesCount"
    `;
  } else {
    // Non-logged-in users: filter hidden projects/datasets/versions/entries/links
    [row] = await prisma.$queryRaw<RawRow[]>`
      SELECT
        (SELECT COUNT(*) FROM "Countries" c
          WHERE EXISTS (SELECT 1 FROM "EntitiesInCountries" ec
                          JOIN "Entities" e ON e."polpalId" = ec."polpalId"
                         WHERE ec."countrycodePolpal" = c."countrycodePolpal"
                           AND e."isHidden" = false
                           AND e."entityType" IN ('PARTY', 'GROUPING', 'UNASSIGNED'))
        ) AS "countriesCount",
        (SELECT COUNT(*) FROM "Entities"    WHERE "isHidden" = false AND "entityType" IN ('PARTY', 'GROUPING', 'UNASSIGNED')) AS "allCount",
        (SELECT COUNT(*) FROM "Projects"    WHERE "isHidden" = false) AS "projectsCount",
        (SELECT COUNT(*) FROM "Datasets" d
          WHERE d."isHidden" = false
            AND EXISTS (
              SELECT 1 FROM "Projects" p
               WHERE p."projectKey" = d."projectKey" AND p."isHidden" = false
            )
        ) AS "datasetsCount",
        (SELECT COUNT(*) FROM "Versions" v
          WHERE v."isHidden" = false
            AND EXISTS (
              SELECT 1 FROM "Datasets" d
               WHERE d."datasetKey" = v."datasetKey" AND d."isHidden" = false
                 AND EXISTS (
                   SELECT 1 FROM "Projects" p
                    WHERE p."projectKey" = d."projectKey" AND p."isHidden" = false
                 )
            )
        ) AS "versionsCount",
        (SELECT COUNT(*) FROM "Entries" e
          WHERE EXISTS (
            SELECT 1 FROM "Versions" v
             WHERE v."versionKey" = e."versionKey" AND v."isHidden" = false
               AND EXISTS (
                 SELECT 1 FROM "Datasets" d
                  WHERE d."datasetKey" = v."datasetKey" AND d."isHidden" = false
                    AND EXISTS (
                      SELECT 1 FROM "Projects" p
                       WHERE p."projectKey" = d."projectKey" AND p."isHidden" = false
                    )
               )
          )
        ) AS "entriesCount",
        (SELECT COUNT(*) FROM "LinksEntryToEntity" l
          WHERE EXISTS (
            SELECT 1 FROM "Entries" e
             WHERE e."uniqueObservationId" = l."uniqueObservationId"
               AND EXISTS (
                 SELECT 1 FROM "Versions" v
                  WHERE v."versionKey" = e."versionKey" AND v."isHidden" = false
                    AND EXISTS (
                      SELECT 1 FROM "Datasets" d
                       WHERE d."datasetKey" = v."datasetKey" AND d."isHidden" = false
                         AND EXISTS (
                           SELECT 1 FROM "Projects" p
                            WHERE p."projectKey" = d."projectKey" AND p."isHidden" = false
                         )
                    )
               )
          )
        ) AS "linksCount",
        (SELECT COUNT(*) FROM "Projects")                           AS "totalProjectsCount",
        (SELECT COUNT(*) FROM "Datasets")                           AS "totalDatasetsCount",
        (SELECT COUNT(*) FROM "Versions")                           AS "totalVersionsCount",
        (SELECT COUNT(*) FROM "Entries")                            AS "totalEntriesCount"
    `;
  }

  const data: StatsResult = {
    countriesCount:   Number(row.countriesCount),
    allCount:         Number(row.allCount),
    projectsCount:    Number(row.projectsCount),
    datasetsCount:    Number(row.datasetsCount),
    versionsCount:    Number(row.versionsCount),
    entriesCount:     Number(row.entriesCount),
    linksCount:       Number(row.linksCount),
    totalProjectsCount: Number(row.totalProjectsCount),
    totalDatasetsCount: Number(row.totalDatasetsCount),
    totalVersionsCount: Number(row.totalVersionsCount),
    totalEntriesCount:  Number(row.totalEntriesCount),
  };

  const entry = { data, expiry: Date.now() + STATS_CACHE_TTL_MS };
  if (isLoggedIn) {
    statsCacheAuth = entry;
  } else {
    statsCachePublic = entry;
  }
  return data;
}

// Entities by year — unique PolPaL entity count per entry year
export interface EntityYearItem {
  year: number;
  entityCount: number;
}

type EntityYearCache = { data: EntityYearItem[]; expiry: number } | null;
// E-006: manual TTL cache retained; unstable_cache deprecated in Next 16 and single-container deployment makes migration unnecessary (see AUDIT_REPORT.md E-006)
let entityYearCachePublic: EntityYearCache = null;
// E-006: manual TTL cache retained; unstable_cache deprecated in Next 16 and single-container deployment makes migration unnecessary (see AUDIT_REPORT.md E-006)
let entityYearCacheAuth: EntityYearCache = null;

export async function getEntitiesByYear(isLoggedIn: boolean): Promise<EntityYearItem[]> {
  const cache = isLoggedIn ? entityYearCacheAuth : entityYearCachePublic;
  if (cache && Date.now() < cache.expiry) return cache.data;

  type RawRow = { entryYear: number | null; entityCount: bigint };

  let rows: RawRow[];
  if (isLoggedIn) {
    rows = await prisma.$queryRaw<RawRow[]>`
      SELECT e."entryYear", COUNT(DISTINCT l."polpalId") AS "entityCount"
      FROM "Entries" e
      JOIN "LinksEntryToEntity" l ON l."uniqueObservationId" = e."uniqueObservationId"
      WHERE e."entryYear" IS NOT NULL AND e."entryYear" <= 2030
      GROUP BY e."entryYear"
      ORDER BY e."entryYear"
    `;
  } else {
    rows = await prisma.$queryRaw<RawRow[]>`
      SELECT e."entryYear", COUNT(DISTINCT l."polpalId") AS "entityCount"
      FROM "Entries" e
      JOIN "LinksEntryToEntity" l ON l."uniqueObservationId" = e."uniqueObservationId"
      JOIN "Projects" p ON p."projectKey" = e."projectKey" AND p."isHidden" = false
      JOIN "Datasets" d ON d."datasetKey" = e."datasetKey" AND d."isHidden" = false
      WHERE e."entryYear" IS NOT NULL AND e."entryYear" <= 2030
      GROUP BY e."entryYear"
      ORDER BY e."entryYear"
    `;
  }

  const data: EntityYearItem[] = rows.map(r => ({
    year: r.entryYear as number,
    entityCount: Number(r.entityCount),
  }));

  const cacheEntry = { data, expiry: Date.now() + STATS_CACHE_TTL_MS };
  if (isLoggedIn) {
    entityYearCacheAuth = cacheEntry;
  } else {
    entityYearCachePublic = cacheEntry;
  }
  return data;
}

// Entities by year for a single country — unique PolPaL entity count per entry year
type CountryEntityYearCache = Map<string, { data: EntityYearItem[]; expiry: number }>;
// E-006: manual TTL cache retained; unstable_cache deprecated in Next 16 and single-container deployment makes migration unnecessary (see AUDIT_REPORT.md E-006)
const countryEntityYearCachePublic: CountryEntityYearCache = new Map();
// E-006: manual TTL cache retained; unstable_cache deprecated in Next 16 and single-container deployment makes migration unnecessary (see AUDIT_REPORT.md E-006)
const countryEntityYearCacheAuth: CountryEntityYearCache = new Map();

export async function getEntitiesByYearByCountry(
  countrycodePolpal: string,
  isLoggedIn: boolean,
): Promise<EntityYearItem[]> {
  const cacheMap = isLoggedIn ? countryEntityYearCacheAuth : countryEntityYearCachePublic;
  const cached = cacheMap.get(countrycodePolpal);
  if (cached && Date.now() < cached.expiry) return cached.data;

  type RawRow = { entryYear: number | null; entityCount: bigint };

  let rows: RawRow[];
  if (isLoggedIn) {
    rows = await prisma.$queryRaw<RawRow[]>`
      SELECT e."entryYear", COUNT(DISTINCT l."polpalId") AS "entityCount"
      FROM "Entries" e
      JOIN "LinksEntryToEntity" l ON l."uniqueObservationId" = e."uniqueObservationId"
      JOIN "EntitiesInCountries" ec ON ec."polpalId" = l."polpalId"
      JOIN "Entities" ent ON ent."polpalId" = l."polpalId"
        AND ent."entityType" IN ('PARTY', 'GROUPING', 'UNASSIGNED')
      WHERE ec."countrycodePolpal" = ${countrycodePolpal}
        AND e."entryYear" IS NOT NULL AND e."entryYear" <= 2030
      GROUP BY e."entryYear"
      ORDER BY e."entryYear"
    `;
  } else {
    rows = await prisma.$queryRaw<RawRow[]>`
      SELECT e."entryYear", COUNT(DISTINCT l."polpalId") AS "entityCount"
      FROM "Entries" e
      JOIN "LinksEntryToEntity" l ON l."uniqueObservationId" = e."uniqueObservationId"
      JOIN "EntitiesInCountries" ec ON ec."polpalId" = l."polpalId"
      JOIN "Entities" ent ON ent."polpalId" = l."polpalId"
        AND ent."entityType" IN ('PARTY', 'GROUPING', 'UNASSIGNED')
      JOIN "Projects" p ON p."projectKey" = e."projectKey" AND p."isHidden" = false
      JOIN "Datasets" d ON d."datasetKey" = e."datasetKey" AND d."isHidden" = false
      WHERE ec."countrycodePolpal" = ${countrycodePolpal}
        AND e."entryYear" IS NOT NULL AND e."entryYear" <= 2030
      GROUP BY e."entryYear"
      ORDER BY e."entryYear"
    `;
  }

  const data: EntityYearItem[] = rows.map(r => ({
    year: r.entryYear as number,
    entityCount: Number(r.entityCount),
  }));

  cacheMap.set(countrycodePolpal, { data, expiry: Date.now() + STATS_CACHE_TTL_MS });
  return data;
}