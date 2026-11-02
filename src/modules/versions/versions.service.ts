import 'server-only';
import { ChangeActionEnum, TableNamesEnum } from "@/lib/shared/enums";
import { prisma } from "@/lib/server/prisma.server";
import { logChangelog } from "@/lib/server/changelogLogger";
import logger from '@/lib/server/logger.server';
import { revalidateTag } from 'next/cache';
import { PROJECTS_CACHE_TAG } from "@/lib/shared/cache-tags";

export async function getVersions() {
  try {
    const versions = await prisma.versions.findMany({
      select: {
        isHidden: true,
        isHiddenReason: true,
        projectKey: true,
        datasetKey: true,
        versionKey: true,
        version: true,
        versionName: true,
        versionUrl: true,
        Projects: {
          select: {
            projectKey: true,
            projectNameShort: true,
            projectName: true,
            isHidden: true,
          }
        },
        Datasets: {
          select: {
            datasetKey: true,
            datasetNameShort: true,
            datasetName: true,
            isHidden: true,
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' },
        { versionKey: 'asc' }
      ],
    });

    return versions.map(v => ({
      projectKey: v.Projects?.projectKey,
      projectNameShort: v.Projects?.projectNameShort,
      projectName: v.Projects?.projectName,
      projectIsHidden: v.Projects?.isHidden ?? false,
      datasetKey: v.Datasets?.datasetKey,
      datasetNameShort: v.Datasets?.datasetNameShort,
      datasetName: v.Datasets?.datasetName,
      datasetIsHidden: v.Datasets?.isHidden ?? false,
      versionIsHidden: v.isHidden,
      versionIsHiddenReason: v.isHiddenReason,
      versionKey: v.versionKey,
      version: v.version,
      versionName: v.versionName,
      versionUrl: v.versionUrl,
    }));
  } catch (error) {
    logger.error({ err: error }, 'getVersions failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// GET VERSION ENTRIES (Memory Optimized)
// ------------------------------------------------------------------------------

export async function getVersionEntries(versionKey: string) {
  try {
    // Get basic version info first with minimal data selection
    const versionInfo = await prisma.versions.findUnique({
      where: { versionKey },
      select: {
        isHidden: true,
        isHiddenReason: true,
        versionKey: true,
        version: true,
        versionName: true,
        versionUrl: true,
        versionCitation: true,
        commentVersion: true,
        commentEntries: true,
        Projects: {
          select: {
            isHidden: true,
            projectKey: true,
            projectNameShort: true,
            projectName: true,
          }
        },
        Datasets: {
          select: {
            isHidden: true,
            datasetKey: true,
            datasetNameShort: true,
            datasetName: true,
          }
        },
      },
    });

    // If no version found, return null
    if (!versionInfo) {
      return null;
    }

    // Use connection pooling-friendly raw SQL with limited result sets
    const countryStats = await prisma.$queryRaw<{
      countrycodePolpal: string;
      countryname: string;
      iso2c: string;
      entryCount: bigint;
      linkedEntryCount: bigint;
      uniquePolpalIdCount: bigint;
    }[]>`
      SELECT 
        e."countrycodePolpal" as "countrycodePolpal",
        COALESCE(c.countryname, '') as countryname,
        COALESCE(c.iso2c, '') as iso2c,
        COUNT(e."entryId") as "entryCount",
        COUNT(l."linkEntriesToEntityId") as "linkedEntryCount",
        COUNT(DISTINCT l."polpalId") FILTER (WHERE l."polpalId" IS NOT NULL) as "uniquePolpalIdCount"
      FROM "Entries" e
      LEFT JOIN "Countries" c ON e."countrycodePolpal" = c."countrycodePolpal"
      LEFT JOIN "LinksEntryToEntity" l ON e."uniqueObservationId" = l."uniqueObservationId"
      WHERE e."versionKey" = ${versionKey}
      GROUP BY e."countrycodePolpal", c.countryname, c.iso2c
      ORDER BY e."countrycodePolpal"
      LIMIT 1000
    `;

    // Get unique file info with limit to prevent memory issues
    const fileInfo = await prisma.entries.findFirst({
      where: { versionKey },
      select: {
        usedFile: true,
        dateDownloaded: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { updatedAt: 'desc' },
        { usedFile: 'asc' }
      ],
    });

    // Process data in a memory-efficient way
    const result = {
      projectIsHidden: versionInfo.Projects?.isHidden || false,
      projectKey: versionInfo.Projects.projectKey,
      projectNameShort: versionInfo.Projects.projectNameShort,
      projectName: versionInfo.Projects.projectName,
      datasetIsHidden: versionInfo.Datasets?.isHidden || false,
      datasetKey: versionInfo.Datasets.datasetKey,
      datasetNameShort: versionInfo.Datasets.datasetNameShort,
      datasetName: versionInfo.Datasets.datasetName,
      versionIsHidden: versionInfo.isHidden,
      versionIsHiddenReason: versionInfo.isHiddenReason,
      versionKey: versionInfo.versionKey,
      version: versionInfo.version,
      versionName: versionInfo.versionName,
      versionUrl: versionInfo.versionUrl,
      versionCitation: versionInfo.versionCitation,
      commentVersion: versionInfo.commentVersion,
      commentEntries: versionInfo.commentEntries,
      usedFile: fileInfo?.usedFile || null,
      dateDownloaded: fileInfo?.dateDownloaded || null,
      entriesCreatedAt: fileInfo?.createdAt || null,
      entriesUpdatedAt: fileInfo?.updatedAt || null,
      countryCounts: countryStats.map(stat => {
        const processed = {
          countrycodePolpal: stat.countrycodePolpal,
          countryname: stat.countryname || '',
          iso2c: stat.iso2c || '',
          entryCount: Number(stat.entryCount),
          linkedEntryCount: Number(stat.linkedEntryCount),
          uniquePolpalIdCount: Number(stat.uniquePolpalIdCount)
        };
        // Explicit cleanup of large objects
        return processed;
      }),
    };

    // Hint for garbage collection
    if (global.gc) {
      global.gc();
    }

    // Return the processed result
    return result;

  } catch (error) {
    logger.error({ err: error, versionKey }, 'getVersionEntries memory optimization failed');
    throw error;
  } finally {
    // Force any pending cleanup
    setImmediate(() => {
      if (global.gc) {
        global.gc();
      }
    });
  }
}

// ------------------------------------------------------------------------------
// Get version infos
// ------------------------------------------------------------------------------

export async function getVersionInfos(versionKey: string) {
  try {
    // Get basic version info first with minimal data selection
    const versionInfoRes = await prisma.versions.findUnique({
      where: {
        versionKey: versionKey
      },
      select: {
        isHidden: true,
        isHiddenReason: true,
        projectKey: true,
        datasetKey: true,
        versionKey: true,
        version: true,
        versionName: true,
        versionUrl: true,
        versionCitation: true,
        commentVersion: true,
        commentEntries: true,
        Projects: {
          select: {
            projectKey: true,
            projectNameShort: true,
            projectName: true,
          }
        },
        Datasets: {
          select: {
            datasetKey: true,
            datasetNameShort: true,
            datasetName: true,
          }
        }
      }
    });

    // If no version found, return null
    if (!versionInfoRes) {
      return null;
    }

    // Transform data into desired format
    const versionInfo = {
      projectKey: versionInfoRes.Projects?.projectKey,
      projectNameShort: versionInfoRes.Projects?.projectNameShort,
      projectName: versionInfoRes.Projects?.projectName,
      datasetKey: versionInfoRes.Datasets?.datasetKey,
      datasetNameShort: versionInfoRes.Datasets?.datasetNameShort,
      datasetName: versionInfoRes.Datasets?.datasetName,
      versionKey: versionInfoRes.versionKey,
      version: versionInfoRes.version,
      versionName: versionInfoRes.versionName,
      versionUrl: versionInfoRes.versionUrl,
      versionCitation: versionInfoRes.versionCitation,
      commentVersion: versionInfoRes.commentVersion,
      commentEntries: versionInfoRes.commentEntries,
      isHidden: versionInfoRes.isHidden,
      isHiddenReason: versionInfoRes.isHiddenReason,
    };

    // Return the transformed version info
    return versionInfo;

  } catch (error) {
    logger.error({ err: error, versionKey }, 'getVersionInfos failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// Get all versions for a dataset (lightweight, for auto-link version picker)
// ------------------------------------------------------------------------------

export async function getVersionsByDatasetKey(datasetKey: string) {
  try {
    return await prisma.versions.findMany({
      where: { datasetKey },
      select: {
        versionKey: true,
        version: true,
        versionName: true,
      },
      orderBy: { version: 'asc' },
    });
  } catch (error) {
    logger.error({ err: error, datasetKey }, 'getVersionsByDatasetKey failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// CREATE
// ------------------------------------------------------------------------------

export async function createVersion(
  data: {
    isHidden?: boolean;
    isHiddenReason?: string | null;
    projectKey: string;
    datasetKey: string;
    versionKey: string;
    version: string;
    versionName?: string | null;
    versionUrl: string;
    versionCitation: string[];
    commentVersion?: string | null;
    commentEntries?: string | null;
  },
  userId: number
) {
  try {
    // Fetch the version with the same versionKey to check for existence before creating
    const existing = await prisma.versions.findUnique({
      where: { versionKey: data.versionKey }
    });

    // Proactive check
    if (existing) {
      throw new Error('Version key already exists');
    }

    // Create the version
    const createdVersion = await prisma.versions.create({
      data: {
        ...data,
        userId: userId
      },
    });

    const batchId = crypto.randomUUID();

    // Create changelog entry for creation
    await logChangelog({
      tableName: TableNamesEnum.versions,
      recordId: createdVersion.versionId,
      recordName: createdVersion.versionKey,
      action: ChangeActionEnum.CREATED,
      field: '__created__',
      oldValue: undefined,
      newValue: JSON.stringify(data),
      comment: undefined,
      batchId: batchId,
      userId: userId,
    });

    // Return the created version
    revalidateTag(PROJECTS_CACHE_TAG, { expire: 0 });
    return createdVersion;

  } catch (error) {
    logger.error({ err: error }, 'createVersion failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// UPDATE
// ------------------------------------------------------------------------------

export async function updateVersion(
  versionKey: string,
  data: {
    isHidden?: boolean;
    isHiddenReason?: string | null;
    version?: string;
    versionName?: string | null;
    versionUrl?: string;
    versionCitation?: string[];
    commentVersion?: string | null;
    commentEntries?: string | null;
  },
  userId: number,
) {
  try {
    // Fetch the existing version to compare changes before updating
    const existingVersion = await prisma.versions.findUnique({
      where: { versionKey },
    });

    // Proactive check
    if (!existingVersion) {
      throw new Error("Version not found");
    }

    // Compare changes
    const changedFields: {
      field: string;
      oldValue: string | undefined;
      newValue: string | undefined;
    }[] = [];

    for (const key in data) {
      const oldVal = (existingVersion as Record<string, unknown>)[key];
      const newVal = (data as Record<string, unknown>)[key];
      // Use strict inequality, but also treat null/undefined consistently
      if (
        (oldVal === null || oldVal === undefined) && (newVal === null || newVal === undefined)
          ? false
          : oldVal !== newVal
      ) {
        changedFields.push({
          field: key,
          oldValue: oldVal?.toString() ?? undefined,
          newValue: newVal?.toString() ?? undefined,
        });
      }
    }

    // If no changes detected, just return existing version
    if (changedFields.length === 0) {
      return existingVersion;
    }

    // Update the version
    const updatedVersion = await prisma.versions.update({
      where: { versionKey },
      data: {
        ...data,
      },
    });

    // Generate a batch ID for changelog entries related to this update
    const batchId = crypto.randomUUID();

    // Log changelog entries after the update
    await Promise.all(
      changedFields.map(change =>
        logChangelog({
          tableName: TableNamesEnum.versions,
          recordId: existingVersion.versionId,
          recordName: existingVersion.versionKey,
          action: ChangeActionEnum.UPDATED,
          field: change.field,
          oldValue: change.oldValue,
          newValue: change.newValue,
          comment: undefined,
          batchId: batchId,
          userId: userId,
        })
      )
    );

    // Return the updated version
    revalidateTag(PROJECTS_CACHE_TAG, { expire: 0 });
    return updatedVersion;

  } catch (error) {
    logger.error({ err: error }, 'updateVersion failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// DELETE
// ------------------------------------------------------------------------------

export async function deleteVersion(versionKey: string, userId: number, comment?: string) {
  try {
    // Fetch the existing version to check for existence
    const existingVersion = await prisma.versions.findUnique({
      where: { versionKey },
    });

    // Proactive check
    if (!existingVersion) {
      throw new Error("Version not found");
    }

    // Check for dependent entries before deleting
    const count = await prisma.entries.count({ where: { versionKey } });
    if (count > 0) {
      throw new Error(`Cannot delete version. ${count} entries still exist.`);
    }

    // Delete the version
    await prisma.versions.delete({
      where: { versionKey: versionKey },
    });

    // Generate a batch ID for changelog entries related to this update
    const batchId = crypto.randomUUID();

    // Create changelog entry for deletion before deleting
    await logChangelog({
      tableName: TableNamesEnum.versions,
      recordId: existingVersion.versionId,
      recordName: existingVersion.versionKey,
      action: ChangeActionEnum.DELETED,
      field: '__deleted__',
      oldValue: JSON.stringify(existingVersion),
      newValue: undefined,
      comment: comment?.trim() || undefined,
      batchId: batchId,
      userId: userId,
    });

    // Return the deleted version data
    revalidateTag(PROJECTS_CACHE_TAG, { expire: 0 });
    return existingVersion;

  } catch (error) {
    logger.error({ err: error }, 'deleteVersion failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// Get all versions that have entries for a given country
// ------------------------------------------------------------------------------

export async function getVersionsByCountry(countrycodePolpal: string) {
  try {
    const versions = await prisma.$queryRaw<{
      versionKey: string;
      version: string;
      versionName: string | null;
      versionUrl: string;
      versionCitation: unknown;
      versionIsHidden: boolean;
      projectKey: string;
      projectNameShort: string;
      projectName: string;
      projectUrl: string;
      projectIsHidden: boolean;
      datasetKey: string;
      datasetNameShort: string;
      datasetName: string;
      datasetUrl: string;
      datasetIsHidden: boolean;
    }[]>`
      SELECT
        v."versionKey",
        v."version",
        v."versionName",
        v."versionUrl",
        v."versionCitation",
        v."isHidden" as "versionIsHidden",
        p."projectKey",
        p."projectNameShort",
        p."projectName",
        p."projectUrl",
        p."isHidden" as "projectIsHidden",
        d."datasetKey",
        d."datasetNameShort",
        d."datasetName",
        d."datasetUrl",
        d."isHidden" as "datasetIsHidden"
      FROM "Versions" v
      JOIN "Projects" p ON v."projectKey" = p."projectKey"
      JOIN "Datasets" d ON v."datasetKey" = d."datasetKey"
      WHERE EXISTS (
        SELECT 1 FROM "Entries" e
        WHERE e."versionKey" = v."versionKey" AND e."countrycodePolpal" = ${countrycodePolpal}
      )
      ORDER BY p."projectName" ASC, d."datasetName" ASC, v."version" DESC
    `;

    function parseCitation(raw: unknown): string[] {
      if (!raw) return [];
      if (Array.isArray(raw)) return raw.map(String);
      if (typeof raw === 'string') {
        try { const p = JSON.parse(raw); return Array.isArray(p) ? p.map(String) : [raw]; } catch { return [raw]; }
      }
      return [];
    }

    return versions.map(v => ({
      versionKey: v.versionKey,
      version: v.version,
      versionName: v.versionName,
      versionUrl: v.versionUrl,
      versionCitation: parseCitation(v.versionCitation),
      versionIsHidden: v.versionIsHidden,
      projectKey: v.projectKey,
      projectNameShort: v.projectNameShort,
      projectName: v.projectName,
      projectUrl: v.projectUrl ?? '',
      projectIsHidden: v.projectIsHidden,
      datasetKey: v.datasetKey,
      datasetNameShort: v.datasetNameShort,
      datasetName: v.datasetName,
      datasetUrl: v.datasetUrl ?? '',
      datasetIsHidden: v.datasetIsHidden,
    }));
  } catch (error) {
    logger.error({ err: error, countrycodePolpal }, 'getVersionsByCountry failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// Get all versions with linking progress info
// ------------------------------------------------------------------------------

export async function getVersionsWithLinkingProgress() {
  try {
    // Fetch versions in parallel with a single grouped SQL query that computes
    // linked/validated entry counts for all versions at once, instead of one
    // query per version (N+1).
    const [versions, progressRows] = await Promise.all([
      prisma.versions.findMany({
        select: {
          isHidden: true,
          versionKey: true,
          version: true,
          versionName: true,
          Projects: {
            select: {
              projectKey: true,
              projectNameShort: true,
              projectName: true,
            }
          },
          Datasets: {
            select: {
              datasetKey: true,
              datasetNameShort: true,
              datasetName: true,
            }
          },
          _count: {
            select: {
              Entries: true,
            }
          },
        },
        orderBy: [
          { projectKey: 'asc' },
          { datasetKey: 'asc' },
          { version: 'asc' }
        ],
      }),
      prisma.$queryRaw<{ versionKey: string; linkedCount: bigint; validatedCount: bigint }[]>`
        SELECT
          e."versionKey",
          COUNT(DISTINCT l."uniqueObservationId") as "linkedCount",
          COUNT(DISTINCT CASE WHEN val."validated" = 'APPROVED' THEN l."uniqueObservationId" END) as "validatedCount"
        FROM "Entries" e
        JOIN "LinksEntryToEntity" l ON e."uniqueObservationId" = l."uniqueObservationId"
        LEFT JOIN "ValidationLinks" val ON l."linkEntriesToEntityId" = val."linkId"
        GROUP BY e."versionKey"
      `,
    ]);

    if (versions.length === 0) {
      return [];
    }

    const progressByVersion = new Map(
      progressRows.map((r) => [r.versionKey, r])
    );

    const versionsWithProgress = versions.map((v) => {
      const totalEntries = v._count.Entries;
      const progress = progressByVersion.get(v.versionKey);
      const linkedCount = progress ? Number(progress.linkedCount) : 0;
      const validatedCount = progress ? Number(progress.validatedCount) : 0;
      const linkingProgress = totalEntries > 0 ? (linkedCount / totalEntries) * 100 : 0;
      const validationProgress = totalEntries > 0 ? (validatedCount / totalEntries) * 100 : 0;

      return {
        projectKey: v.Projects?.projectKey,
        projectNameShort: v.Projects?.projectNameShort,
        projectName: v.Projects?.projectName,
        datasetKey: v.Datasets?.datasetKey,
        datasetNameShort: v.Datasets?.datasetNameShort,
        datasetName: v.Datasets?.datasetName,
        versionIsHidden: v.isHidden,
        versionKey: v.versionKey,
        version: v.version,
        versionName: v.versionName,
        totalEntries,
        linkingProgress: linkingProgress.toFixed(2),
        validationProgress: validationProgress.toFixed(2),
      };
    });

    return versionsWithProgress;

  } catch (error) {
    logger.error({ err: error }, 'getVersionsWithLinkingProgress failed');
    throw error;
  }
}