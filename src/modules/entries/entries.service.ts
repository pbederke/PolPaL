import 'server-only';
import { prisma } from "@/lib/server/prisma.server";
import logger from '@/lib/server/logger.server';
import { logChangelog } from '@/lib/server/changelogLogger';
import { ChangeActionEnum, TableNamesEnum } from '@/lib/shared/enums';
import { revalidateTag } from 'next/cache';
import { PROJECTS_CACHE_TAG } from '@/lib/shared/cache-tags';
import { ImportEntriesSingleSchema } from './entries.schema';

// ------------------------------------------------------------------------------
// Get Entries by Version and Country
// ------------------------------------------------------------------------------

export async function getEntriesByVersionCountry(versionKey: string, countrycodePolpal: string) {
  try {
    const entriesData = await prisma.entries.findMany({
      where: { versionKey, countrycodePolpal },
      include: {
        Projects: {
          select: {
            isHidden: true,
            projectKey: true,
            projectNameShort: true,
            projectName: true,
          },
        },
        Datasets: {
          select: {
            isHidden: true,
            datasetKey: true,
            datasetNameShort: true,
            datasetName: true,
          },
        },
        Versions: {
          select: {
            isHidden: true,
            isHiddenReason: true,
            versionKey: true,
            version: true,
            versionName: true,
            commentVersion: true,
            commentEntries: true,
          },
        },
        Countries: {
          select: {
            countrycodePolpal: true,
            countryname: true,
            iso2c: true,
          },
        },
        LinksEntryToEntity: {
          select: {
            linkEntriesToEntityId: true,
            polpalId: true,
            userId: true,
            Entities: {
              select: {
                partyfactsId: true,
                entityType: true,
                nameShort: true,
                nameEnglish: true,
                name: true,
                wikipediaUrl: true,
                wikidataId: true,
              },
            },
            startYear: true,
            startMonth: true,
            startDay: true,
            endYear: true,
            endMonth: true,
            endDay: true,
            comment: true,
            ValidationLinks: {
              select: {
                userId: true,
                validated: true,
                comment: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    });

    if (!entriesData || entriesData.length === 0) {
      logger.warn({ versionKey, countrycodePolpal }, 'No entries found for given version and country');
      return [];
    }

    const entries = {
      projectIsHidden: entriesData[0].Projects.isHidden,
      projectKey: entriesData[0].Projects.projectKey,
      projectNameShort: entriesData[0].Projects.projectNameShort,
      projectName: entriesData[0].Projects.projectName,
      datasetIsHidden: entriesData[0].Datasets.isHidden,
      datasetKey: entriesData[0].Datasets.datasetKey,
      datasetNameShort: entriesData[0].Datasets.datasetNameShort,
      datasetName: entriesData[0].Datasets.datasetName,
      versionIsHidden: entriesData[0].Versions.isHidden,
      versionIsHiddenReason: entriesData[0].Versions.isHiddenReason,
      versionKey: entriesData[0].Versions.versionKey,
      version: entriesData[0].Versions.version,
      versionName: entriesData[0].Versions.versionName,
      versionCommentVersion: entriesData[0].Versions.commentVersion,
      versionCommentEntries: entriesData[0].Versions.commentEntries,
      countrycodePolpal: entriesData[0].Countries.countrycodePolpal,
      countryname: entriesData[0].Countries.countryname,
      iso2c: entriesData[0].Countries.iso2c,
      Entries: entriesData.map((e) => ({
        entryId: e.entryId,
        entryYear: e.entryYear,
        entryMonth: e.entryMonth,
        entryDay: e.entryDay,
        entryEntityIdVar: e.entryEntityIdVar,
        entryEntityId: e.entryEntityId,
        entryEntityNameShort: e.entryEntityNameShort,
        entryEntityNameEnglish: e.entryEntityNameEnglish,
        entryEntityName: e.entryEntityName,
        additionalInformation: e.additionalInformation,
        uniqueObservationId: e.uniqueObservationId,
        note: e.note,
        LinksEntryToEntity: e.LinksEntryToEntity.map((l) => ({
          linkEntriesToEntityId: l.linkEntriesToEntityId,
          polpalId: l.polpalId,
          partyfactsId: l.Entities.partyfactsId ?? null,
          linkCreatorUserId: l.userId,
          entityType: l.Entities.entityType,
          entityNameShort: l.Entities.nameShort,
          entityNameEnglish: l.Entities.nameEnglish,
          entityName: l.Entities.name,
          wikipediaUrl: l.Entities.wikipediaUrl,
          wikidataId: l.Entities.wikidataId,
          startYear: l.startYear,
          startMonth: l.startMonth,
          startDay: l.startDay,
          endYear: l.endYear,
          endMonth: l.endMonth,
          endDay: l.endDay,
          comment: l.comment,
          ValidationLinks: l.ValidationLinks.map((v) => ({
            userId: v.userId,
            verified: v.validated,
            comment: v.comment,
            updatedAt: v.updatedAt.toISOString(),
          })),
        })),
      })),
    };

    return entries;
  } catch (error) {
    logger.error({ versionKey, countrycodePolpal, error }, 'Error fetching entries by version and country');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// Get grouped entries by country and count for Links
// ------------------------------------------------------------------------------

export async function getGroupedEntriesByCountry(versionKey: string) {
  try {
    // Use single optimized raw SQL query instead of multiple Prisma queries
    const countryStatsRaw = await prisma.$queryRaw<{
      countrycodePolpal: string;
      countryname: string | null;
      iso2c: string | null;
      entryCount: bigint;
      linkedEntryCount: bigint;
      uniquePolpalIdsCount: bigint;
    }[]>`
      SELECT 
        e."countrycodePolpal",
        c.countryname,
        c.iso2c,
        COUNT(e."entryId") as "entryCount",
        COUNT(CASE WHEN l."linkEntriesToEntityId" IS NOT NULL THEN 1 END) as "linkedEntryCount",
        COUNT(DISTINCT l."polpalId") FILTER (WHERE l."polpalId" IS NOT NULL) as "uniquePolpalIdsCount"
      FROM "Entries" e
      LEFT JOIN "Countries" c ON e."countrycodePolpal" = c."countrycodePolpal"
      LEFT JOIN "LinksEntryToEntity" l ON e."uniqueObservationId" = l."uniqueObservationId"
      WHERE e."versionKey" = ${versionKey}
      GROUP BY e."countrycodePolpal", c.countryname, c.iso2c
      ORDER BY e."countrycodePolpal"
    `;

    // Get version details and file info with minimal data selection
    const [versionDetails, minMaxDates, fileInfo] = await Promise.all([

      prisma.versions.findUnique({
        where: { versionKey },
        select: {
          version: true,
          versionName: true,
          versionUrl: true,
          versionCitation: true,
          Datasets: {
            select: {
              datasetNameShort: true,
              datasetName: true,
              Projects: {
                select: { projectNameShort: true, projectName: true },
              },
            },
          },
        },
      }),

      prisma.entries.aggregate({
        where: { versionKey },
        _min: { createdAt: true },
        _max: { updatedAt: true },
      }),

      prisma.entries.findFirst({
        where: { versionKey },
        select: {
          usedFile: true,
          dateDownloaded: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const result = {
      projectNameShort: versionDetails?.Datasets?.Projects?.projectNameShort ?? null,
      projectName: versionDetails?.Datasets?.Projects?.projectName ?? null,
      datasetNameShort: versionDetails?.Datasets?.datasetNameShort ?? null,
      datasetName: versionDetails?.Datasets?.datasetName ?? null,
      versionKey,
      version: versionDetails?.version ?? null,
      versionName: versionDetails?.versionName ?? null,
      versionUrl: versionDetails?.versionUrl ?? null,
      versionCitation: versionDetails?.versionCitation ?? null,
      usedFile: fileInfo?.usedFile ?? null,
      dateDownloaded: fileInfo?.dateDownloaded ?? null,
      firstImport: minMaxDates._min.createdAt ?? null,
      lastUpdate: minMaxDates._max.updatedAt ?? null,
      countries: countryStatsRaw.map((item) => ({
        countrycodePolpal: item.countrycodePolpal,
        countryname: item.countryname ?? null,
        iso2c: item.iso2c ?? null,
        entryCount: Number(item.entryCount),
        linkedEntryCount: Number(item.linkedEntryCount),
        uniquePolpalIdsCount: Number(item.uniquePolpalIdsCount),
      })),
    };

    // Hint for garbage collection
    if (global.gc) {
      global.gc();
    }

    return result;

  } catch (error) {
    logger.error({ err: error, versionKey }, 'getGroupedEntriesByCountry failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// STREAMING IMPORT - processes entries in memory-efficient chunks
// ------------------------------------------------------------------------------

export async function importEntriesStreaming(
  userId: number,
  entries: unknown[] // validated per-chunk below
) {
  const batchId = crypto.randomUUID();
  let versionKey = ''; // captured from first valid chunk
  let totalCreated = 0;
  let totalSkipped = 0;
  let chunksProcessed = 0;
  const chunkSize = 1000; // Smaller chunks for maximum memory efficiency
  const totalEntries = entries.length;

  const startMemory = process.memoryUsage();
  logger.debug({ totalEntries, chunkSize }, '[STREAMING] Starting streaming import');
  logger.debug({ heapMB: (startMemory.heapUsed / 1024 / 1024).toFixed(1) }, '[STREAMING] Initial memory');

  // Force immediate garbage collection to start clean
  if (global.gc) {
    global.gc();
    global.gc();
  }

  // Process entries using true streaming - immediately clear after processing
  while (entries.length > 0) {
    chunksProcessed++;
    const remaining = entries.length;
    const currentChunkSize = Math.min(chunkSize, remaining);

    // Extract MINIMAL chunk and immediately remove from original array
    const chunk = entries.splice(0, currentChunkSize);

    // Validate chunk — throws ZodError on first invalid row, caught by route handler.
    // 1000 rows at a time avoids building a full validated copy of the whole body.
    const parsed = ImportEntriesSingleSchema.safeParse(chunk);
    if (!parsed.success) throw parsed.error;
    if (!versionKey && parsed.data.length > 0) versionKey = parsed.data[0].versionKey;

    // Clear unused memory immediately after splice
    if (chunksProcessed % 5 === 0 && global.gc) {
      global.gc();
    }

    const chunkStartMemory = process.memoryUsage();
    const heapMB = chunkStartMemory.heapUsed / 1024 / 1024;

    logger.debug({ chunk: chunksProcessed, count: chunk.length, remaining, heapMB: heapMB.toFixed(1) }, '[STREAMING] Processing chunk');

    // Pause if memory keeps climbing despite streaming
    if (heapMB > 300) {
      logger.warn({ heapMB: heapMB.toFixed(1) }, '[STREAMING] Critical memory threshold exceeded — forcing GC');
      // await new Promise(resolve => setTimeout(resolve, 5000)); // Pause for 5 seconds
      if (global.gc) { global.gc(); } // Force GC after pause
    }

    try {
      // Process chunk with minimal object creation
      const createManyData = [];

      for (let i = 0; i < parsed.data.length; i++) {
        const entry = parsed.data[i];
        createManyData.push({
          usedFile: entry.usedFile,
          dateDownloaded: entry.dateDownloaded,
          projectKey: entry.projectKey,
          datasetKey: entry.datasetKey,
          versionKey: entry.versionKey,
          entryCountryVar: entry.entryCountryVar || null,
          entryCountry: entry.entryCountry || null,
          entryYearVar: entry.entryYearVar || null,
          entryYear: entry.entryYear || null,
          entryMonthVar: entry.entryMonthVar || null,
          entryMonth: entry.entryMonth || null,
          entryDayVar: entry.entryDayVar || null,
          entryDay: entry.entryDay || null,
          entryEntityIdVar: entry.entryEntityIdVar,
          entryEntityId: entry.entryEntityId,
          entryEntityNameShortVar: entry.entryEntityNameShortVar || null,
          entryEntityNameShort: entry.entryEntityNameShort || null,
          entryEntityNameEnglishVar: entry.entryEntityNameEnglishVar || null,
          entryEntityNameEnglish: entry.entryEntityNameEnglish || null,
          entryEntityNameVar: entry.entryEntityNameVar || null,
          entryEntityName: entry.entryEntityName || null,
          additionalInformation: entry.additionalInformation || null,
          countrycodePolpal: entry.countrycodePolpal,
          uniqueObservationId: entry.uniqueObservationId,
          note: entry.note || null,
          userId: userId
        });
      }

      const result = await prisma.entries.createMany({
        data: createManyData,
        skipDuplicates: false
      });

      const insertedCount = result.count;
      totalCreated += insertedCount;

      // Track any potential skipped entries (should be 0 with skipDuplicates: false)
      const expectedCount = createManyData.length;
      const actuallySkipped = expectedCount - insertedCount;
      totalSkipped += actuallySkipped;

      if (actuallySkipped > 0) {
        logger.warn({ chunk: chunksProcessed, expectedCount, insertedCount, skipped: actuallySkipped }, '[STREAMING] Entry count discrepancy in chunk');
      }
      logger.debug({ chunk: chunksProcessed, insertedCount, expectedCount }, '[STREAMING] Chunk inserted');

      // Immediate ultra-aggressive cleanup
      createManyData.length = 0;
      chunk.length = 0;

      // Force garbage collection more frequently in streaming mode
      if (global.gc) {
        global.gc();
      }

      // Progress logging every 20 chunks to reduce memory overhead
      if (chunksProcessed % 20 === 0) {
        const currentMemory = process.memoryUsage();
        const processed = totalEntries - entries.length;
        const progressPct = (processed / totalEntries * 100).toFixed(1);
        logger.debug({ progress: progressPct, processed, totalEntries, totalCreated, heapMB: (currentMemory.heapUsed / 1024 / 1024).toFixed(1) }, '[STREAMING] Progress');

        // Force aggressive cleanup every 20 chunks
        if (global.gc) {
          global.gc();
          global.gc();
        }
      }

      // Minimal delay between chunks to allow cleanup
      // await new Promise(resolve => setTimeout(resolve, 10));

    } catch (error: unknown) {
      logger.error({ err: error, chunk: chunksProcessed }, '[STREAMING] Error in chunk');

      // CRITICAL: Count failed entries as skipped to maintain accurate count
      totalSkipped += chunk.length;
      logger.warn({ chunk: chunksProcessed, skipped: chunk.length }, '[STREAMING] Chunk failed — entries marked as skipped');

      // For streaming, we continue on errors unless it's a memory error
      if (error instanceof Error && (error.message.includes('heap') || error.message.includes('memory'))) {
        logger.error({ heapMB: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1) }, '[STREAMING] Memory error — aborting stream');
        break;
      }

      // Skip this chunk and continue
      chunk.length = 0;
    }
  }

  const endMemory = process.memoryUsage();
  const memoryChange = (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024;
  const totalProcessed = totalCreated + totalSkipped;

  logger.info({ totalEntries, totalCreated, totalSkipped, totalProcessed, chunksProcessed, memoryChangeMB: memoryChange.toFixed(1) }, '[STREAMING] Import complete');

  // CRITICAL CHECK: Ensure all entries are accounted for
  if (totalProcessed !== totalEntries) {
    logger.error({ totalEntries, totalProcessed, missing: totalEntries - totalProcessed }, '[STREAMING] CRITICAL: Entry count mismatch');
  } else {
    logger.debug({ totalProcessed, totalEntries }, '[STREAMING] All entries accounted for');
  }

  // Final aggressive cleanup
  entries.length = 0;
  if (global.gc) {
    global.gc();
    global.gc();
  }

  if (versionKey) {
    const version = await prisma.versions.findUnique({ where: { versionKey }, select: { versionId: true } });
    await logChangelog({
      tableName: TableNamesEnum.entries,
      recordId: version?.versionId ?? 0,
      recordName: versionKey,
      action: ChangeActionEnum.CREATED,
      field: '__created__',
      newValue: `${versionKey}: ${totalCreated} entries created (chunk streaming)`,
      batchId,
      userId,
    });
  }

  revalidateTag(PROJECTS_CACHE_TAG, { expire: 0 });

  return {
    totalProcessed,
    totalCreated,
    totalSkipped,
    chunksProcessed,
    batchId,
    streaming: true,
    memoryUsage: {
      initialHeap: Math.round(startMemory.heapUsed / 1024 / 1024),
      finalHeap: Math.round(endMemory.heapUsed / 1024 / 1024),
      memoryChange: Math.round(memoryChange)
    }
  };
}

// ------------------------------------------------------------------------------
// Get entries for sync (lean — all scalar fields, no joins)
// ------------------------------------------------------------------------------

export async function getEntriesForSync(versionKey: string) {
  try {
    return await prisma.entries.findMany({
      where: { versionKey },
      select: {
        uniqueObservationId: true,
        usedFile: true,
        dateDownloaded: true,
        projectKey: true,
        datasetKey: true,
        versionKey: true,
        entryCountryVar: true,
        entryCountry: true,
        entryYearVar: true,
        entryYear: true,
        entryMonthVar: true,
        entryMonth: true,
        entryDayVar: true,
        entryDay: true,
        entryEntityIdVar: true,
        entryEntityId: true,
        entryEntityNameShortVar: true,
        entryEntityNameShort: true,
        entryEntityNameEnglishVar: true,
        entryEntityNameEnglish: true,
        entryEntityNameVar: true,
        entryEntityName: true,
        additionalInformation: true,
        countrycodePolpal: true,
        note: true,
      },
    });
  } catch (error) {
    logger.error({ err: error, versionKey }, 'getEntriesForSync failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// Sync entries (create + update + delete) for a version
// ------------------------------------------------------------------------------

type SyncEntry = {
  usedFile: string;
  dateDownloaded: string;
  projectKey: string;
  datasetKey: string;
  versionKey: string;
  entryCountryVar?: string;
  entryCountry?: string;
  entryYearVar?: string;
  entryYear?: number;
  entryMonthVar?: string;
  entryMonth?: number;
  entryDayVar?: string;
  entryDay?: number;
  entryEntityIdVar: string;
  entryEntityId: string;
  entryEntityNameShortVar?: string;
  entryEntityNameShort?: string;
  entryEntityNameEnglishVar?: string;
  entryEntityNameEnglish?: string;
  entryEntityNameVar?: string;
  entryEntityName?: string;
  additionalInformation?: string;
  countrycodePolpal: string;
  uniqueObservationId: string;
  note?: string;
};

export async function syncEntries(
  userId: number,
  toCreate: SyncEntry[],
  toUpdate: SyncEntry[],
  toDelete: string[]
) {
  let created = 0;
  let updated = 0;
  let deleted = 0;

  // Create — chunked createMany
  const createChunkSize = 1000;
  for (let i = 0; i < toCreate.length; i += createChunkSize) {
    const chunk = toCreate.slice(i, i + createChunkSize);
    const result = await prisma.entries.createMany({
      data: chunk.map((e) => ({
        usedFile: e.usedFile,
        dateDownloaded: e.dateDownloaded,
        projectKey: e.projectKey,
        datasetKey: e.datasetKey,
        versionKey: e.versionKey,
        entryCountryVar: e.entryCountryVar ?? null,
        entryCountry: e.entryCountry ?? null,
        entryYearVar: e.entryYearVar ?? null,
        entryYear: e.entryYear ?? null,
        entryMonthVar: e.entryMonthVar ?? null,
        entryMonth: e.entryMonth ?? null,
        entryDayVar: e.entryDayVar ?? null,
        entryDay: e.entryDay ?? null,
        entryEntityIdVar: e.entryEntityIdVar,
        entryEntityId: e.entryEntityId,
        entryEntityNameShortVar: e.entryEntityNameShortVar ?? null,
        entryEntityNameShort: e.entryEntityNameShort ?? null,
        entryEntityNameEnglishVar: e.entryEntityNameEnglishVar ?? null,
        entryEntityNameEnglish: e.entryEntityNameEnglish ?? null,
        entryEntityNameVar: e.entryEntityNameVar ?? null,
        entryEntityName: e.entryEntityName ?? null,
        additionalInformation: e.additionalInformation ?? null,
        countrycodePolpal: e.countrycodePolpal,
        uniqueObservationId: e.uniqueObservationId,
        note: e.note ?? null,
        userId,
      })),
      skipDuplicates: false,
    });
    created += result.count;
  }

  // Update — batched in groups of 100 to avoid overwhelming the connection pool
  const updateBatchSize = 100;
  for (let i = 0; i < toUpdate.length; i += updateBatchSize) {
    const batch = toUpdate.slice(i, i + updateBatchSize);
    await Promise.all(
      batch.map((e) =>
        prisma.entries.update({
          where: { uniqueObservationId: e.uniqueObservationId },
          data: {
            usedFile: e.usedFile,
            dateDownloaded: e.dateDownloaded,
            projectKey: e.projectKey,
            datasetKey: e.datasetKey,
            versionKey: e.versionKey,
            entryCountryVar: e.entryCountryVar ?? null,
            entryCountry: e.entryCountry ?? null,
            entryYearVar: e.entryYearVar ?? null,
            entryYear: e.entryYear ?? null,
            entryMonthVar: e.entryMonthVar ?? null,
            entryMonth: e.entryMonth ?? null,
            entryDayVar: e.entryDayVar ?? null,
            entryDay: e.entryDay ?? null,
            entryEntityIdVar: e.entryEntityIdVar,
            entryEntityId: e.entryEntityId,
            entryEntityNameShortVar: e.entryEntityNameShortVar ?? null,
            entryEntityNameShort: e.entryEntityNameShort ?? null,
            entryEntityNameEnglishVar: e.entryEntityNameEnglishVar ?? null,
            entryEntityNameEnglish: e.entryEntityNameEnglish ?? null,
            entryEntityNameVar: e.entryEntityNameVar ?? null,
            entryEntityName: e.entryEntityName ?? null,
            additionalInformation: e.additionalInformation ?? null,
            countrycodePolpal: e.countrycodePolpal,
            note: e.note ?? null,
            userId,
          },
        })
      )
    );
    updated += batch.length;
  }

  // Delete
  if (toDelete.length > 0) {
    const result = await prisma.entries.deleteMany({
      where: { uniqueObservationId: { in: toDelete } },
    });
    deleted = result.count;
  }

  // Changelog — one summary entry per action type
  const versionKey =
    toCreate[0]?.versionKey ??
    toUpdate[0]?.versionKey ??
    (toDelete.length > 0
      ? (await prisma.entries.findFirst({ where: { uniqueObservationId: toDelete[0] }, select: { versionKey: true } }))?.versionKey
      : undefined);

  if (versionKey) {
    const version = await prisma.versions.findUnique({ where: { versionKey }, select: { versionId: true } });
    const recordId = version?.versionId ?? 0;
    const batchId = crypto.randomUUID();

    if (created > 0) {
      await logChangelog({
        tableName: TableNamesEnum.entries,
        recordId,
        recordName: versionKey,
        action: ChangeActionEnum.CREATED,
        field: '__created__',
        newValue: JSON.stringify({ versionKey, created }),
        comment: `${versionKey}: ${created} entries created`,
        batchId,
        userId,
      });
    }
    if (updated > 0) {
      await logChangelog({
        tableName: TableNamesEnum.entries,
        recordId,
        recordName: versionKey,
        action: ChangeActionEnum.UPDATED,
        field: '__updated__',
        newValue: JSON.stringify({ versionKey, updated }),
        comment: `${versionKey}: ${updated} entries updated`,
        batchId,
        userId,
      });
    }
    if (deleted > 0) {
      await logChangelog({
        tableName: TableNamesEnum.entries,
        recordId,
        recordName: versionKey,
        action: ChangeActionEnum.DELETED,
        field: '__deleted__',
        oldValue: JSON.stringify({ versionKey, deleted }),
        comment: `${versionKey}: ${deleted} entries deleted`,
        batchId,
        userId,
      });
    }
  }

  revalidateTag(PROJECTS_CACHE_TAG, { expire: 0 });

  return { created, updated, deleted };
}

// ------------------------------------------------------------------------------
// Get entry by entryId
// ------------------------------------------------------------------------------

export async function getEntryByEntryId(entryId: number) {
  // Get entry by entryId
  const entry = await prisma.entries.findUnique({
    where: { entryId },
    include: {
      Countries: {
        select: {
          countrycodePolpal: true,
          countryname: true,
          iso2c: true,
        },
      },
      Projects: {
        select: {
          projectName: true,
          projectNameShort: true,
        },
      },
      Datasets: {
        select: {
          datasetName: true,
          datasetNameShort: true,
        },
      },
      Versions: {
        select: {
          version: true,
          versionName: true,
        },
      },
      LinksEntryToEntity: {
        include: {
          Entities: {
            select: {
              polpalId: true,
              nameShort: true,
              nameEnglish: true,
              name: true,
              entityType: true,
              wikipediaUrl: true,
              wikidataId: true,
              EntityNames: {
                select: {
                  entityNameId: true,
                  nameShort: true,
                  name: true,
                  language: true,
                  startYear: true,
                  startMonth: true,
                  startDay: true,
                  endYear: true,
                  endMonth: true,
                  endDay: true,
                },
              },
            },
          },
          ValidationLinks: {
            select: {
              userId: true,
              validated: true,
              comment: true,
              updatedAt: true,
            },
          },
        },
      },
    },
  });

  if (!entry) return null;

  if (entry.LinksEntryToEntity.length === 0) return entry;

  // Compute appearanceFirst/Last for each linked entity in this entry's country
  const polpalIds = entry.LinksEntryToEntity.map((l) => l.Entities.polpalId);
  const currentYear = new Date().getFullYear();

  const linkYears = await prisma.linksEntryToEntity.findMany({
    where: {
      polpalId: { in: polpalIds },
      Entries: { countrycodePolpal: entry.countrycodePolpal },
    },
    select: {
      polpalId: true,
      Entries: { select: { entryYear: true } },
    },
  });

  const appearanceByEntity = new Map<number, { first: number | null; last: number | null }>();
  for (const id of polpalIds) {
    const years = linkYears
      .filter((l) => l.polpalId === id && l.Entries.entryYear != null && l.Entries.entryYear <= currentYear)
      .map((l) => l.Entries.entryYear as number);
    appearanceByEntity.set(id, {
      first: years.length > 0 ? Math.min(...years) : null,
      last: years.length > 0 ? Math.max(...years) : null,
    });
  }

  return {
    ...entry,
    LinksEntryToEntity: entry.LinksEntryToEntity.map((link) => ({
      ...link,
      Entities: {
        ...link.Entities,
        appearanceFirst: appearanceByEntity.get(link.Entities.polpalId)?.first ?? null,
        appearanceLast: appearanceByEntity.get(link.Entities.polpalId)?.last ?? null,
      },
    })),
  };
}

// ------------------------------------------------------------------------------
// GET entries VERSION + COUNTRY AGGREGATED
// ------------------------------------------------------------------------------

export async function getEntriesByVersionCountryAggregated(
  versionKey: string,
  countrycodePolpal: string
) {
  const entries = await prisma.entries.findMany({
    where: { versionKey, countrycodePolpal },
    select: {
      entryId: true,
      entryYear: true,
      entryMonth: true,
      entryDay: true,
      entryEntityIdVar: true,
      entryEntityId: true,
      entryEntityNameShort: true,
      entryEntityNameEnglish: true,
      entryEntityName: true,
      uniqueObservationId: true,
      Projects: { select: { projectNameShort: true, projectName: true } },
      Datasets: { select: { datasetNameShort: true, datasetName: true } },
      Versions: { select: { version: true, versionName: true } },
      Countries: { select: { countrycodePolpal: true, countryname: true, iso2c: true } },
      LinksEntryToEntity: {
        select: {
          uniqueObservationId: true,
          polpalId: true,
          Entities: {
            select: {
              nameShort: true,
              nameEnglish: true,
              polpalId: true
            }
          }
        }
      },
    }
  });

  // Group by entryEntityIdVar + entryEntityId
  const groups = new Map<
    string,
    {
      entryEntityIdVar: string | null;
      entryEntityId: string | null;
      firstDate: { year: number | null; month: number | null; day: number | null };
      lastDate: { year: number | null; month: number | null; day: number | null };
      firstNames: {
        nameShort: string | null;
        nameEnglish: string | null;
        name: string | null;
      };
      allNames: {
        nameShort: Set<string>;
        nameEnglish: Set<string>;
        name: Set<string>;
      };
      allUniqueObservationIds: {
        uniqueObservationIds: Set<string>;
      },
      linkedUniqueObservationIds: Set<string>;
      projectNameShort?: string | null;
      projectName?: string | null;
      datasetNameShort?: string | null;
      datasetName?: string | null;
      version?: string | null;
      versionName?: string | null;
      countrycodePolpal?: string | null;
      countryname?: string | null;
      iso2c?: string | null;
      allLinks: {
        polpalId: Set<number>;
        nameShort: Set<string>;
        nameEnglish: Set<string>;
      }
    }
  >();

  for (const e of entries) {
    const key = `${e.entryEntityIdVar}-${e.entryEntityId}-${e.Projects.projectNameShort}-${e.Datasets.datasetNameShort}-${e.Versions.version}-${e.Countries.countrycodePolpal}-${e.Countries.countryname}-${e.Countries.iso2c}`;

    const dateObj = {
      year: e.entryYear,
      month: e.entryMonth,
      day: e.entryDay,
    };

    if (!groups.has(key)) {
      groups.set(key, {
        entryEntityIdVar: e.entryEntityIdVar,
        entryEntityId: e.entryEntityId,
        firstDate: { ...dateObj },
        lastDate: { ...dateObj },
        firstNames: {
          nameShort: e.entryEntityNameShort,
          nameEnglish: e.entryEntityNameEnglish,
          name: e.entryEntityName,
        },
        allNames: {
          nameShort: new Set(e.entryEntityNameShort ? [e.entryEntityNameShort] : []),
          nameEnglish: new Set(e.entryEntityNameEnglish ? [e.entryEntityNameEnglish] : []),
          name: new Set(e.entryEntityName ? [e.entryEntityName] : []),
        },
        allUniqueObservationIds: {
          uniqueObservationIds: new Set(e.uniqueObservationId ? [e.uniqueObservationId] : []),
        },
        linkedUniqueObservationIds: new Set(e.LinksEntryToEntity.length > 0 && e.uniqueObservationId ? [e.uniqueObservationId] : []),
        projectNameShort: e.Projects.projectNameShort,
        projectName: e.Projects.projectName,
        datasetNameShort: e.Datasets.datasetNameShort,
        datasetName: e.Datasets.datasetName,
        version: e.Versions.version,
        versionName: e.Versions.versionName,
        countrycodePolpal: e.Countries.countrycodePolpal,
        countryname: e.Countries.countryname,
        iso2c: e.Countries.iso2c,
        allLinks: {
          polpalId: new Set(e.LinksEntryToEntity.flatMap((l) => l.polpalId != null ? [l.polpalId] : [])),
          nameShort: new Set(e.LinksEntryToEntity.flatMap((l) => l.Entities && l.Entities.nameShort ? [l.Entities.nameShort] : [])),
          nameEnglish: new Set(e.LinksEntryToEntity.flatMap((l) => l.Entities && l.Entities.nameEnglish ? [l.Entities.nameEnglish] : [])),
        },
      });
    } else {
      const group = groups.get(key)!;

      // Update date ranges
      const currentDate = new Date(
        e.entryYear ?? 9999,
        (e.entryMonth ?? 1) - 1,
        e.entryDay ?? 1
      );
      const first = new Date(
        group.firstDate.year ?? 9999,
        (group.firstDate.month ?? 1) - 1,
        group.firstDate.day ?? 1
      );
      const last = new Date(
        group.lastDate.year ?? 0,
        (group.lastDate.month ?? 1) - 1,
        group.lastDate.day ?? 1
      );

      if (currentDate < first)
        group.firstDate = { ...dateObj };
      if (currentDate > last)
        group.lastDate = { ...dateObj };

      // Add names
      if (e.entryEntityNameShort) group.allNames.nameShort.add(e.entryEntityNameShort);
      if (e.entryEntityNameEnglish) group.allNames.nameEnglish.add(e.entryEntityNameEnglish);
      if (e.entryEntityName) group.allNames.name.add(e.entryEntityName);

      // Add uniqueObservationIds
      if (e.uniqueObservationId) group.allUniqueObservationIds.uniqueObservationIds.add(e.uniqueObservationId);

      // Track linked uniqueObservationIds
      if (e.LinksEntryToEntity.length > 0 && e.uniqueObservationId) {
        group.linkedUniqueObservationIds.add(e.uniqueObservationId);
      }

      // Accumulate allLinks from all grouped entries
      for (const l of e.LinksEntryToEntity) {
        if (l.polpalId != null) group.allLinks.polpalId.add(l.polpalId);
        if (l.Entities && l.Entities.nameShort) group.allLinks.nameShort.add(l.Entities.nameShort);
        if (l.Entities && l.Entities.nameEnglish) group.allLinks.nameEnglish.add(l.Entities.nameEnglish);
      }
    }
  }

  // Convert to final output format
  return Array.from(groups.values()).map((g) => {
    const totalCount = g.allUniqueObservationIds.uniqueObservationIds.size;
    const linkedCount = g.linkedUniqueObservationIds.size;

    let linkedComplete: "Complete" | "Incomplete" | "None";
    if (linkedCount === 0) {
      linkedComplete = "None";
    } else if (linkedCount === totalCount) {
      linkedComplete = "Complete";
    } else {
      linkedComplete = "Incomplete";
    }

    return {
      id: `${g.entryEntityIdVar}-${g.entryEntityId}`,
      entryEntityIdVar: g.entryEntityIdVar,
      entryEntityId: g.entryEntityId,
      firstDate: g.firstDate,
      lastDate: g.lastDate,
      firstNames: g.firstNames,
      allNames: {
        nameShort: Array.from(g.allNames.nameShort),
        nameEnglish: Array.from(g.allNames.nameEnglish),
        name: Array.from(g.allNames.name),
      },
      allUniqueObservationIds: {
        uniqueObservationIds: Array.from(g.allUniqueObservationIds.uniqueObservationIds),
      },
      linkedComplete,
      projectNameShort: g.projectNameShort,
      projectName: g.projectName,
      datasetNameShort: g.datasetNameShort,
      datasetName: g.datasetName,
      version: g.version,
      versionName: g.versionName,
      countrycodePolpal: g.countrycodePolpal,
      countryname: g.countryname,
      iso2c: g.iso2c,
      allLinks: {
        polpalId: Array.from(g.allLinks.polpalId),
        nameShort: Array.from(g.allLinks.nameShort),
        nameEnglish: Array.from(g.allLinks.nameEnglish),
      },
    };
  });
}

// ------------------------------------------------------------------------------
// DELETE entries by versionKey
// ------------------------------------------------------------------------------

export async function deleteEntriesByVersion(versionKey: string) {
  // Delete entries by versionKey
  const deleted = await prisma.entries.deleteMany({
    where: { versionKey },
  });
  revalidateTag(PROJECTS_CACHE_TAG, { expire: 0 });
  return deleted.count;
}

// ------------------------------------------------------------------------------
// GET entries that are linked to entityType UNKNOWN (for quality checks)
// ------------------------------------------------------------------------------

export async function getUnknownEntries() {
  const unknownEntries = await prisma.entries.findMany({
    where: { LinksEntryToEntity: { some: { Entities: { entityType: 'UNKNOWN' } } } },
    select: {
      Projects: { select: { projectKey: true, projectNameShort: true, projectName: true } },
      Datasets: { select: { datasetKey: true, datasetNameShort: true, datasetName: true } },
      Versions: { select: { versionKey: true, version: true, versionName: true } },
      entryId: true,
      entryYear: true,
      entryMonth: true,
      entryDay: true,
      entryEntityIdVar: true,
      entryEntityId: true,
      entryEntityNameShort: true,
      entryEntityNameEnglish: true,
      entryEntityName: true,
      countrycodePolpal: true,
      uniqueObservationId: true,
      Countries: { select: { countryname: true, iso2c: true } },
      LinksEntryToEntity: {
        where: { Entities: { entityType: 'UNKNOWN' } },
        select: { polpalId: true },
        take: 1,
      },
    },
  });

  const formattedEntries = unknownEntries.map((e) => ({
    projectKey: e.Projects.projectKey,
    projectNameShort: e.Projects.projectNameShort,
    projectName: e.Projects.projectName,
    datasetKey: e.Datasets.datasetKey,
    datasetNameShort: e.Datasets.datasetNameShort,
    datasetName: e.Datasets.datasetName,
    versionKey: e.Versions.versionKey,
    version: e.Versions.version,
    versionName: e.Versions.versionName,
    entryId: e.entryId,
    entryYear: e.entryYear,
    entryMonth: e.entryMonth,
    entryDay: e.entryDay,
    entryEntityIdVar: e.entryEntityIdVar,
    entryEntityId: e.entryEntityId,
    entryEntityNameShort: e.entryEntityNameShort,
    entryEntityNameEnglish: e.entryEntityNameEnglish,
    entryEntityName: e.entryEntityName,
    countrycodePolpal: e.countrycodePolpal,
    countryname: e.Countries?.countryname ?? null,
    iso2c: e.Countries?.iso2c ?? null,
    uniqueObservationId: e.uniqueObservationId,
    linkedPolpalId: e.LinksEntryToEntity[0]?.polpalId ?? null,
  }));

  return formattedEntries;
}

// ------------------------------------------------------------------------------
// Get entries for a version, paginated
// ------------------------------------------------------------------------------

export async function getEntriesByVersionPaginated(versionKey: string) {
  const entries = await prisma.entries.findMany({
      where: { versionKey },
      orderBy: [{ countrycodePolpal: 'asc' }, { entryId: 'asc' }],
      select: {
        entryId: true,
        countrycodePolpal: true,
        entryCountry: true,
        entryYear: true,
        entryMonth: true,
        entryDay: true,
        entryEntityIdVar: true,
        entryEntityId: true,
        entryEntityNameShort: true,
        entryEntityNameEnglish: true,
        entryEntityName: true,
        uniqueObservationId: true,
        Countries: {
          select: {
            countryname: true,
            iso2c: true,
          },
        },
        Projects: {
          select: {
            projectNameShort: true,
            projectName: true,
          },
        },
        Datasets: {
          select: {
            datasetNameShort: true,
            datasetName: true,
          },
        },
        Versions: {
          select: {
            version: true,
            versionName: true,
          },
        },
        _count: {
          select: { LinksEntryToEntity: true },
        },
      },
    });

  return entries.map((e) => ({
      entryId: e.entryId,
      countrycodePolpal: e.countrycodePolpal,
      countryname: e.Countries.countryname,
      iso2c: e.Countries.iso2c,
      entryCountry: e.entryCountry,
      entryYear: e.entryYear,
      entryMonth: e.entryMonth,
      entryDay: e.entryDay,
      entryEntityIdVar: e.entryEntityIdVar,
      entryEntityId: e.entryEntityId,
      entryEntityNameShort: e.entryEntityNameShort,
      entryEntityNameEnglish: e.entryEntityNameEnglish,
      entryEntityName: e.entryEntityName,
      uniqueObservationId: e.uniqueObservationId,
      projectNameShort: e.Projects.projectNameShort,
      projectName: e.Projects.projectName,
      datasetNameShort: e.Datasets.datasetNameShort,
      datasetName: e.Datasets.datasetName,
      version: e.Versions.version,
      versionName: e.Versions.versionName,
      linkCount: e._count.LinksEntryToEntity,
    }));
}

// ------------------------------------------------------------------------------
// Get Entries by Version and Entity
// ------------------------------------------------------------------------------

export async function getEntriesByVersionEntity(versionKey: string, polpalId: number) {
  try {
    const [entriesData, entity, version] = await Promise.all([
      prisma.entries.findMany({
        where: {
          versionKey,
          LinksEntryToEntity: { some: { polpalId } },
        },
        orderBy: [{ entryYear: 'asc' }, { entryEntityId: 'asc' }],
        select: {
          entryId: true,
          entryEntityIdVar: true,
          entryEntityId: true,
          entryEntityNameShort: true,
          entryEntityNameEnglish: true,
          entryEntityName: true,
          entryYear: true,
          entryMonth: true,
          entryDay: true,
          additionalInformation: true,
          note: true,
          countrycodePolpal: true,
          Countries: { select: { countryname: true, iso2c: true } },
          LinksEntryToEntity: {
            select: {
              polpalId: true,
              ValidationLinks: {
                select: { validated: true },
              },
            },
          },
        },
      }),
      prisma.entities.findUnique({
        where: { polpalId },
        select: {
          polpalId: true,
          nameShort: true,
          nameEnglish: true,
          name: true,
          entityType: true,
          isHidden: true,
          wikipediaUrl: true,
          wikidataId: true,
          EntityNames: {
            select: {
              entityNameId: true,
              nameShort: true,
              name: true,
              language: true,
              startYear: true,
              startMonth: true,
              startDay: true,
              endYear: true,
              endMonth: true,
              endDay: true,
            },
            orderBy: [{ startYear: 'asc' }],
          },
          EntitiesInCountries: {
            select: {
              countrycodePolpal: true,
              Countries: { select: { countryname: true } },
            },
          },
        },
      }),
      prisma.versions.findUnique({
        where: { versionKey },
        select: {
          versionKey: true,
          version: true,
          versionName: true,
          projectKey: true,
          datasetKey: true,
          Projects: { select: { projectNameShort: true, projectName: true } },
          Datasets: { select: { datasetNameShort: true, datasetName: true } },
        },
      }),
    ]);

    if (!entity) return null;

    return {
      entityPolpalId: entity.polpalId,
      entityNameShort: entity.nameShort,
      entityNameEnglish: entity.nameEnglish,
      entityIsHidden: entity.isHidden,
      entityCountries: entity.EntitiesInCountries.map((eic) => ({
        countrycodePolpal: eic.countrycodePolpal,
        countryname: eic.Countries?.countryname ?? undefined,
      })),
      entity: {
        polpalId: entity.polpalId,
        nameShort: entity.nameShort,
        nameEnglish: entity.nameEnglish,
        name: entity.name ?? '',
        entityType: entity.entityType,
        wikipediaUrl: entity.wikipediaUrl ?? null,
        wikidataId: entity.wikidataId ?? null,
        EntityNames: entity.EntityNames,
      },
      versionKey: version?.versionKey ?? versionKey,
      version: version?.version ?? '',
      versionName: version?.versionName ?? null,
      projectKey: version?.projectKey ?? '',
      projectNameShort: version?.Projects?.projectNameShort ?? '',
      projectName: version?.Projects?.projectName ?? '',
      datasetKey: version?.datasetKey ?? '',
      datasetNameShort: version?.Datasets?.datasetNameShort ?? '',
      datasetName: version?.Datasets?.datasetName ?? '',
      entries: entriesData.map((e) => ({
        entryId: e.entryId,
        entryEntityIdVar: e.entryEntityIdVar,
        entryEntityId: e.entryEntityId,
        entryEntityNameShort: e.entryEntityNameShort,
        entryEntityNameEnglish: e.entryEntityNameEnglish,
        entryEntityName: e.entryEntityName,
        entryYear: e.entryYear,
        entryMonth: e.entryMonth,
        entryDay: e.entryDay,
        additionalInformation: e.additionalInformation,
        note: e.note,
        countrycodePolpal: e.countrycodePolpal,
        iso2c: e.Countries?.iso2c ?? null,
        countryname: e.Countries?.countryname ?? null,
        hasMultipleLinked: e.LinksEntryToEntity.length > 1,
        hasApproved: e.LinksEntryToEntity.some(
          (l) => l.polpalId === polpalId && l.ValidationLinks.some((v) => v.validated === 'APPROVED')
        ),
        hasRejected: e.LinksEntryToEntity.some(
          (l) => l.polpalId === polpalId && l.ValidationLinks.some((v) => v.validated === 'REJECTED')
        ),
      })),
    };
  } catch (error) {
    logger.error({ versionKey, polpalId, error }, 'Error fetching entries by version and entity');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// Get entries with their links for auto-link matching (version comparison)
// ------------------------------------------------------------------------------

export async function getEntriesWithLinksForMatching(versionKey: string) {
  try {
    return await prisma.entries.findMany({
      where: { versionKey },
      select: {
        uniqueObservationId: true,
        projectKey: true,
        datasetKey: true,
        entryCountryVar: true,
        entryCountry: true,
        entryYearVar: true,
        entryYear: true,
        entryMonthVar: true,
        entryMonth: true,
        entryDayVar: true,
        entryDay: true,
        entryEntityIdVar: true,
        entryEntityId: true,
        entryEntityNameShortVar: true,
        entryEntityNameShort: true,
        entryEntityNameEnglishVar: true,
        entryEntityNameEnglish: true,
        entryEntityNameVar: true,
        entryEntityName: true,
        additionalInformation: true,
        countrycodePolpal: true,
        note: true,
        LinksEntryToEntity: {
          select: {
            polpalId: true,
            startYear: true,
            startMonth: true,
            startDay: true,
            endYear: true,
            endMonth: true,
            endDay: true,
            comment: true,
            Entities: {
              select: {
                nameShort: true,
                nameEnglish: true,
              },
            },
          },
        },
      },
    });
  } catch (error) {
    logger.error({ err: error, versionKey }, 'getEntriesWithLinksForMatching failed');
    throw error;
  }
}