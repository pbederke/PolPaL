import 'server-only';
import { DownloadType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/server/prisma.server';
import logger from '@/lib/server/logger.server';

export function logDownload(params: {
  downloadType: DownloadType;
  versionKey?: string;
  filters: Prisma.InputJsonValue;
}): void {
  prisma.downloadLog.create({
    data: {
      downloadType: params.downloadType,
      versionKey: params.versionKey ?? null,
      filters: params.filters,
    },
  }).catch((err: unknown) => {
    logger.error({ err }, '[download-log] Failed to log download');
  });
}

export async function getDownloadAnalytics() {
  const [byType, topEntries, topScripts, dailyRaw, monthlyRaw, entryVersionStatsRaw, topDatasetsRaw, topProjectsRaw] = await Promise.all([
    // Total downloads grouped by type
    prisma.downloadLog.groupBy({
      by: ['downloadType'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),

    // Top 10 entry version keys by download count
    prisma.downloadLog.groupBy({
      by: ['versionKey'],
      where: { downloadType: 'ENTRIES', versionKey: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),

    // Top 10 script names by download count
    prisma.downloadLog.groupBy({
      by: ['versionKey'],
      where: { downloadType: 'SCRIPT', versionKey: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),

    // Daily download counts for the last 30 days
    prisma.$queryRaw<{ date: string; downloadType: string; count: bigint }[]>`
      SELECT
        DATE("downloadedAt")::text AS date,
        "downloadType"::text,
        COUNT(*)::bigint AS count
      FROM download_logs
      WHERE "downloadedAt" >= NOW() - INTERVAL '30 days'
      GROUP BY DATE("downloadedAt"), "downloadType"
      ORDER BY date ASC, "downloadType" ASC
    `,

    // Monthly download counts (all time)
    prisma.$queryRaw<{ month: string; downloadType: string; count: bigint }[]>`
      SELECT
        TO_CHAR(DATE_TRUNC('month', "downloadedAt"), 'YYYY-MM') AS month,
        "downloadType"::text,
        COUNT(*)::bigint AS count
      FROM download_logs
      GROUP BY DATE_TRUNC('month', "downloadedAt"), "downloadType"
      ORDER BY month ASC, "downloadType" ASC
    `,

    // All entry versions with per-filter breakdown
    prisma.$queryRaw<{
      versionKey: string;
      total: bigint;
      noFilter: bigint;
      withCountry: bigint;
      withRegion: bigint;
      withYear: bigint;
      withVariables: bigint;
      withShort: bigint;
      withSpecialLinks: bigint;
    }[]>`
      SELECT
        "versionKey",
        COUNT(*)::bigint                                                             AS total,
        COUNT(*) FILTER (WHERE filters::jsonb = '{}'::jsonb)::bigint                AS "noFilter",
        COUNT(*) FILTER (WHERE filters::jsonb ? 'countries')::bigint                AS "withCountry",
        COUNT(*) FILTER (WHERE filters::jsonb ? 'regions')::bigint                  AS "withRegion",
        COUNT(*) FILTER (WHERE (filters::jsonb ? 'yearFrom') OR (filters::jsonb ? 'yearTo'))::bigint AS "withYear",
        COUNT(*) FILTER (WHERE filters::jsonb ? 'variables')::bigint                AS "withVariables",
        COUNT(*) FILTER (WHERE filters::jsonb ? 'short')::bigint                    AS "withShort",
        COUNT(*) FILTER (WHERE (filters::jsonb->>'includeSpecialEntityLinks')::boolean IS TRUE)::bigint AS "withSpecialLinks"
      FROM download_logs
      WHERE "downloadType" = 'ENTRIES' AND "versionKey" IS NOT NULL
      GROUP BY "versionKey"
      ORDER BY total DESC
    `,

    // Top datasets by ENTRIES download count
    prisma.$queryRaw<{ datasetKey: string; datasetNameShort: string; count: bigint }[]>`
      SELECT v."datasetKey", d."datasetNameShort", COUNT(dl.id)::bigint AS count
      FROM download_logs dl
      JOIN "Versions" v ON dl."versionKey" = v."versionKey"
      JOIN "Datasets" d ON v."datasetKey" = d."datasetKey"
      WHERE dl."downloadType" = 'ENTRIES'
      GROUP BY v."datasetKey", d."datasetNameShort"
      ORDER BY count DESC
    `,

    // Top projects by ENTRIES download count
    prisma.$queryRaw<{ projectKey: string; projectNameShort: string; count: bigint }[]>`
      SELECT v."projectKey", p."projectNameShort", COUNT(dl.id)::bigint AS count
      FROM download_logs dl
      JOIN "Versions" v ON dl."versionKey" = v."versionKey"
      JOIN "Projects" p ON v."projectKey" = p."projectKey"
      WHERE dl."downloadType" = 'ENTRIES'
      GROUP BY v."projectKey", p."projectNameShort"
      ORDER BY count DESC
    `,
  ]);

  return {
    byType: byType.map(r => ({ downloadType: r.downloadType, count: r._count.id })),
    topEntries: topEntries.map(r => ({ versionKey: r.versionKey, count: r._count.id })),
    topScripts: topScripts.map(r => ({ scriptName: r.versionKey, count: r._count.id })),
    daily: dailyRaw.map(r => ({ date: r.date, downloadType: r.downloadType, count: Number(r.count) })),
    monthly: monthlyRaw.map(r => ({ month: r.month, downloadType: r.downloadType, count: Number(r.count) })),
    allEntryVersions: entryVersionStatsRaw.map(r => ({
      versionKey:    r.versionKey,
      count:         Number(r.total),
      noFilter:      Number(r.noFilter),
      withCountry:   Number(r.withCountry),
      withRegion:    Number(r.withRegion),
      withYear:      Number(r.withYear),
      withVariables:    Number(r.withVariables),
      withShort:        Number(r.withShort),
      withSpecialLinks: Number(r.withSpecialLinks),
    })),
    topDatasets: topDatasetsRaw.map(r => ({ datasetKey: r.datasetKey, datasetNameShort: r.datasetNameShort, count: Number(r.count) })),
    topProjects: topProjectsRaw.map(r => ({ projectKey: r.projectKey, projectNameShort: r.projectNameShort, count: Number(r.count) })),
  };
}
