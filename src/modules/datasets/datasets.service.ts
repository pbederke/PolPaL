import 'server-only';
import { ChangeActionEnum, TableNamesEnum } from "@prisma/client";
import { prisma } from "@/lib/server/prisma.server";
import { logChangelog } from "@/lib/server/changelogLogger";
import logger from '@/lib/server/logger.server';
import { revalidateTag } from 'next/cache';
import { PROJECTS_CACHE_TAG } from "@/lib/shared/cache-tags";

// ------------------------------------------------------------------------------
// Get dataset versions by datasetKey
// ------------------------------------------------------------------------------

export async function getDatasetVersions(datasetKey: string) {
  try {
    // Get basic dataset info first with minimal data selection
    const datasetInfoRes = await prisma.datasets.findUnique({
      where: { datasetKey },
      select: {
        isHidden: true,
        isHiddenReason: true,
        datasetKey: true,
        datasetNameShort: true,
        datasetName: true,
        datasetUrl: true,
        datasetDescription: true,
        comment: true,
        Projects: {
          select: {
            isHidden: true,
            isHiddenReason: true,
            projectKey: true,
            projectNameShort: true,
            projectName: true,
          },
        },
        Versions: {
          select: {
            isHidden: true,
            isHiddenReason: true,
            versionKey: true,
            version: true,
            versionName: true,
            versionUrl: true,
            versionCitation: true,
            _count: {
              select: { Entries: true },
            },
            Entries: {
              select: {
                countrycodePolpal: true,
                Countries: {
                  select: {
                    iso2c: true,
                    countryname: true,
                  },
                },
              },
              distinct: ['countrycodePolpal'],
              orderBy: {
                countrycodePolpal: 'asc',
              },
            },
          },
          orderBy: {
            version: 'asc',
          },
        },
      },
    });

    // If dataset not found, return null
    if (!datasetInfoRes) {
      return null;
    }

    // Transform data into desired format
    const datasetInfo = {
      projectIsHidden: datasetInfoRes.Projects?.isHidden,
      projectIsHiddenReason: datasetInfoRes.Projects?.isHiddenReason,
      projectKey: datasetInfoRes.Projects?.projectKey,
      projectNameShort: datasetInfoRes.Projects?.projectNameShort,
      projectName: datasetInfoRes.Projects?.projectName,
      datasetIsHidden: datasetInfoRes.isHidden,
      datasetIsHiddenReason: datasetInfoRes.isHiddenReason,
      datasetKey: datasetInfoRes.datasetKey,
      datasetNameShort: datasetInfoRes.datasetNameShort,
      datasetName: datasetInfoRes.datasetName,
      datasetUrl: datasetInfoRes.datasetUrl,
      datasetDescription: datasetInfoRes.datasetDescription,
      datasetComment: datasetInfoRes.comment,
      Versions: datasetInfoRes.Versions.map(version => ({
        versionIsHidden: version.isHidden,
        versionIsHiddenReason: version.isHiddenReason,
        versionKey: version.versionKey,
        version: version.version,
        versionName: version.versionName,
        versionUrl: version.versionUrl,
        versionCitation: version.versionCitation,
        entryCount: version._count.Entries,
        countries: version.Entries.map(entry => ({
          countrycodePolpal: entry.countrycodePolpal,
          iso2c: entry.Countries.iso2c ?? null,
          countryname: entry.Countries.countryname,
        })),
      })),
    };

    // Return the transformed dataset versions info
    return datasetInfo;

  } catch (error) {
    logger.error({ err: error, datasetKey }, 'getDatasetVersions failed');
    throw error;
  } finally {
    // Force cleanup
    setImmediate(() => {
      if (global.gc) {
        global.gc();
      }
    });
  }
}


// ------------------------------------------------------------------------------
// GET all datasets for homepage
// ------------------------------------------------------------------------------

export async function getAllDatasetsHomepage() {
  try {
    // Get all datasets with their associated project info, ordered by project name and dataset name
    const datasets = await prisma.datasets.findMany({
      select: {
        isHidden: true,
        isHiddenReason: true,
        datasetKey: true,
        datasetNameShort: true,
        datasetName: true,
        Projects: {
          select: {
            isHidden: true,
            isHiddenReason: true,
            projectKey: true,
            projectNameShort: true,
            projectName: true,
          },
        },
      },
      orderBy: [
        {
          Projects: {
            projectNameShort: 'asc',
          },
        },
        {
          datasetNameShort: 'asc',
        },
      ],
    });

    // Transform data into desired format
    const datasetsHomepage = datasets.map(ds => ({
      projectIsHidden: ds.Projects?.isHidden,
      projectKey: ds.Projects?.projectKey,
      projectNameShort: ds.Projects?.projectNameShort,
      projectName: ds.Projects?.projectName,
      datasetIsHidden: ds.isHidden,
      datasetKey: ds.datasetKey,
      datasetNameShort: ds.datasetNameShort,
      datasetName: ds.datasetName,
    }));

    // Return the transformed datasets info for homepage
    return datasetsHomepage;

  } catch (error) {
    logger.error({ err: error }, 'getAllDatasetsHomepage failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// Get dataset infos
// ------------------------------------------------------------------------------

export async function getDatasetInfos(datasetKey: string) {
  try {
    // Get basic dataset info first with minimal data selection
    const datasetInfoRes = await prisma.datasets.findUnique({
      where: {
        datasetKey: datasetKey
      },
      select: {
        isHidden: true,
        isHiddenReason: true,
        datasetKey: true,
        datasetNameShort: true,
        datasetName: true,
        datasetUrl: true,
        datasetDescription: true,
        comment: true,
        Projects: {
          select: {
            projectKey: true,
            projectNameShort: true,
            projectName: true,
          }
        },
      }
    });

    // If no dataset found, return null
    if (!datasetInfoRes) {
      return null;
    }

    // Transform data into desired format
    const datasetInfo = {
      projectKey: datasetInfoRes.Projects?.projectKey,
      projectNameShort: datasetInfoRes.Projects?.projectNameShort,
      projectName: datasetInfoRes.Projects?.projectName,
      datasetIsHidden: datasetInfoRes.isHidden,
      datasetIsHiddenReason: datasetInfoRes.isHiddenReason,
      datasetKey: datasetInfoRes.datasetKey,
      datasetNameShort: datasetInfoRes.datasetNameShort,
      datasetName: datasetInfoRes.datasetName,
      datasetUrl: datasetInfoRes.datasetUrl,
      datasetDescription: datasetInfoRes.datasetDescription,
      comment: datasetInfoRes.comment,
    };

    // Return the transformed dataset info
    return datasetInfo;

  } catch (error) {
    logger.error({ err: error, datasetKey }, 'getDatasetInfos failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// CREATE
// ------------------------------------------------------------------------------

export async function createDataset(
  data: {
    isHidden?: boolean;
    isHiddenReason?: string | null;
    projectKey: string;
    datasetKey: string;
    datasetNameShort: string;
    datasetName: string;
    datasetUrl?: string | null;
    datasetDescription?: string | null;
    comment?: string | null;
  },
  userId: number
) {
  try {
    // Fetch existing dataset
    const existing = await prisma.datasets.findUnique({
      where: { datasetKey: data.datasetKey }
    });

    // Proactive check
    if (existing) {
      throw new Error('Dataset key already exists');
    }

    // Create the dataset
    const createdDataset = await prisma.datasets.create({
      data: {
        ...data,
        userId: userId
      },
    });

    const batchId = crypto.randomUUID();

    // Create changelog entry for creation
    await logChangelog({
      tableName: TableNamesEnum.datasets,
      recordId: createdDataset.datasetId,
      recordName: createdDataset.datasetName,
      action: ChangeActionEnum.CREATED,
      field: '__created__',
      oldValue: undefined,
      newValue: JSON.stringify(data),
      comment: undefined,
      batchId: batchId,
      userId: userId,
    });

    // Return the created dataset
    revalidateTag(PROJECTS_CACHE_TAG, { expire: 0 });
    return createdDataset;

  } catch (error) {
    logger.error({ err: error }, 'createDataset failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// UPDATE
// ------------------------------------------------------------------------------

export async function updateDataset(
  datasetKey: string,
  data: {
    isHidden?: boolean;
    isHiddenReason?: string | null;
    datasetNameShort?: string;
    datasetName?: string;
    datasetUrl?: string | null;
    datasetDescription?: string | null;
    comment?: string | null;
  },
  userId: number,
) {
  try {
    // Fetch existing dataset
    const existingDataset = await prisma.datasets.findUnique({
      where: { datasetKey },
    });

    // Proactive check
    if (!existingDataset) {
      throw new Error("Dataset not found");
    }

    // Compare changes
    const changedFields: {
      field: string;
      oldValue: string | undefined;
      newValue: string | undefined;
    }[] = [];

    for (const key in data) {
      const oldVal = (existingDataset as Record<string, unknown>)[key];
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

    // If no changes detected, just return existing dataset
    if (changedFields.length === 0) {
      return existingDataset;
    }

    const batchId = crypto.randomUUID();

    // Perform update in transaction, then log changelog entries after
    const updatedDataset = await prisma.datasets.update({
      where: { datasetKey },
      data: {
        ...data,
      },
    });

    // Log changelog entries (not in transaction)
    await Promise.all(
      changedFields.map(change =>
        logChangelog({
          tableName: TableNamesEnum.datasets,
          recordId: existingDataset.datasetId,
          recordName: existingDataset.datasetKey,
          action: ChangeActionEnum.UPDATED,
          field: change.field,
          oldValue: change.oldValue,
          newValue: change.newValue,
          comment: undefined,
          batchId: batchId,
          userId: Number(userId),
        })
      )
    );

    // Return the updated dataset
    revalidateTag(PROJECTS_CACHE_TAG, { expire: 0 });
    return updatedDataset;

  } catch (error) {
    logger.error({ err: error }, 'updateDataset failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// DELETE
// ------------------------------------------------------------------------------

export async function deleteDataset(datasetKey: string, userId: number, comment?: string) {
  try {
    // Fetch existing dataset
    const existingDataset = await prisma.datasets.findUnique({
      where: { datasetKey },
    });

    // Proactive check
    if (!existingDataset) {
      throw new Error("Dataset not found");
    }

    // Check for existing versions
    const count = await prisma.versions.count({ where: { datasetKey } });
    if (count > 0) {
      throw new Error(`Cannot delete dataset. ${count} versions still exist.`);
    }

    const batchId = crypto.randomUUID();

    // Delete the dataset
    await prisma.datasets.delete({
      where: { datasetKey: datasetKey },
    });

    // Create changelog entry for deletion before deleting
    await logChangelog({
      tableName: TableNamesEnum.datasets,
      recordId: existingDataset.datasetId,
      recordName: existingDataset.datasetKey,
      action: ChangeActionEnum.DELETED,
      field: '__deleted__',
      oldValue: JSON.stringify(existingDataset),
      newValue: undefined,
      comment: comment?.trim() || undefined,
      batchId: batchId,
      userId: Number(userId),
    });

    // Return the deleted dataset data
    revalidateTag(PROJECTS_CACHE_TAG, { expire: 0 });
    return existingDataset;

  } catch (error) {
    logger.error({ err: error }, 'deleteDataset failed');
    throw error;
  }
}
