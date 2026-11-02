import 'server-only';
import { ChangeActionEnum, TableNamesEnum } from "@/lib/shared/enums";
import { prisma } from "@/lib/server/prisma.server";
import { logChangelog } from "@/lib/server/changelogLogger";
import logger from '@/lib/server/logger.server';
import { unstable_cache, revalidateTag } from 'next/cache';
import { PROJECTS_CACHE_TAG } from "@/lib/shared/cache-tags";

// ------------------------------------------------------------------------------
// Get All Project Datasets
// ------------------------------------------------------------------------------

const fetchAllProjectDatasetsCached = unstable_cache(
  async () => {
    // Fetch projects/datasets/versions without entry rows, plus the distinct
    // countries per version computed in SQL instead of transferring every
    // entry row to dedupe in the Prisma engine.
    const [projectsWithDatasets, countryGroups, countries] = await Promise.all([
      prisma.projects.findMany({
        select: {
          isHidden: true,
          isHiddenReason: true,
          projectKey: true,
          projectNameShort: true,
          projectName: true,
          projectUrl: true,
          projectDescription: true,
          comment: true,
          Datasets: {
            select: {
              isHidden: true,
              isHiddenReason: true,
              datasetKey: true,
              datasetName: true,
              datasetNameShort: true,
              datasetUrl: true,
              comment: true,
              Versions: {
                select: {
                  isHidden: true,
                  isHiddenReason: true,
                  versionKey: true,
                  version: true,
                  versionName: true,
                  versionUrl: true,
                  versionCitation: true,
                },
                orderBy: {
                  version: 'asc',
                },
              },
            },
          },
        },
        orderBy: {
          projectKey: 'asc',
        },
      }),
      prisma.entries.groupBy({
        by: ['versionKey', 'countrycodePolpal'],
        orderBy: { countrycodePolpal: 'asc' },
      }),
      prisma.countries.findMany({
        select: {
          countrycodePolpal: true,
          iso2c: true,
          countryname: true,
        },
      }),
    ]);

    const countryByCode = new Map(countries.map((c) => [c.countrycodePolpal, c]));

    const countriesByVersion = new Map<string, {
      countrycodePolpal: string;
      iso2c: string | null;
      countryname: string;
    }[]>();
    for (const g of countryGroups) {
      const meta = countryByCode.get(g.countrycodePolpal);
      if (!meta) continue;
      const arr = countriesByVersion.get(g.versionKey) ?? [];
      arr.push({
        countrycodePolpal: g.countrycodePolpal,
        iso2c: meta.iso2c ?? null,
        countryname: meta.countryname,
      });
      countriesByVersion.set(g.versionKey, arr);
    }

    // Transform data into desired format
    const allProjectDatasets = projectsWithDatasets.map(project => ({
      projectIsHidden: project.isHidden,
      projectIsHiddenReason: project.isHiddenReason,
      projectKey: project.projectKey,
      projectNameShort: project.projectNameShort,
      projectName: project.projectName,
      projectUrl: project.projectUrl,
      projectDescription: project.projectDescription,
      projectComment: project.comment,
      Datasets: project.Datasets.map(ds => ({
        datasetIsHidden: ds.isHidden,
        datasetIsHiddenReason: ds.isHiddenReason,
        datasetKey: ds.datasetKey,
        datasetName: ds.datasetName,
        datasetNameShort: ds.datasetNameShort,
        datasetUrl: ds.datasetUrl,
        comment: ds.comment,
        Versions: ds.Versions.map(v => ({
          versionIsHidden: v.isHidden,
          versionIsHiddenReason: v.isHiddenReason,
          versionKey: v.versionKey,
          version: v.version,
          versionName: v.versionName,
          versionUrl: v.versionUrl,
          versionCitation: v.versionCitation as string[] | null,
          countries: countriesByVersion.get(v.versionKey) ?? [],
        })),
      })),
    }));

    // Return the transformed data
    return allProjectDatasets;
  },
  ['projects-list'],
  { tags: [PROJECTS_CACHE_TAG], revalidate: 3600 }
);

export async function getAllProjectDatasets() {
  try {
    return await fetchAllProjectDatasetsCached();
  } catch (error) {
    logger.error({ err: error }, 'getAllProjectDatasets failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// Get Project Datasets
// ------------------------------------------------------------------------------

export async function getProjectDatasets(projectKey: string) {
  try {
    // Fetch project with datasets and their version counts
    const projectDatasets = await prisma.projects.findUnique({
      where: { projectKey },
      select: {
        isHidden: true,
        isHiddenReason: true,
        projectKey: true,
        projectNameShort: true,
        projectName: true,
        projectUrl: true,
        projectDescription: true,
        comment: true,
        Datasets: {
          select: {
            isHidden: true,
            isHiddenReason: true,
            datasetKey: true,
            datasetName: true,
            datasetNameShort: true,
            datasetUrl: true,
            comment: true,
            Versions: {
              select: {
                isHidden: true,
                isHiddenReason: true,
                versionKey: true,
                version: true,
                versionName: true,
                versionUrl: true,
                versionCitation: true,
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
                  orderBy: { countrycodePolpal: 'asc' },
                },
              },
              orderBy: {
                version: 'desc',
              },
            },
          },
          orderBy: {
            datasetKey: 'asc',
          },
        },
      },
    });

    // If no project found, return null
    if (!projectDatasets) {
      return null;
    }

    // Transform data into desired format
    const projectDatasetInfo = {
      projectIsHidden: projectDatasets.isHidden,
      projectIsHiddenReason: projectDatasets.isHiddenReason,
      projectKey: projectDatasets.projectKey,
      projectNameShort: projectDatasets.projectNameShort,
      projectName: projectDatasets.projectName,
      projectUrl: projectDatasets.projectUrl,
      projectDescription: projectDatasets.projectDescription,
      projectComment: projectDatasets.comment,
      Datasets: projectDatasets.Datasets.map(ds => ({
        datasetIsHidden: ds.isHidden,
        datasetIsHiddenReason: ds.isHiddenReason,
        datasetKey: ds.datasetKey,
        datasetName: ds.datasetName,
        datasetNameShort: ds.datasetNameShort,
        datasetUrl: ds.datasetUrl,
        datasetComment: ds.comment,
        Versions: ds.Versions.map(v => ({
          versionIsHidden: v.isHidden,
          versionIsHiddenReason: v.isHiddenReason,
          versionKey: v.versionKey,
          version: v.version,
          versionName: v.versionName,
          versionUrl: v.versionUrl,
          versionCitation: v.versionCitation as string[] | null,
          countries: v.Entries.map(e => ({
            countrycodePolpal: e.countrycodePolpal,
            countryname: e.Countries.countryname,
            iso2c: e.Countries.iso2c ?? null,
          })),
        })),
      })),
    };

    // Return the transformed project info
    return projectDatasetInfo;

  } catch (error) {
    logger.error({ err: error }, 'getProjectDatasets failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// Get project infos
// ------------------------------------------------------------------------------

export async function getProjectInfos(projectKey: string) {
  try {
    // Get basic project info first with minimal data selection
    const projectInfoRes = await prisma.projects.findUnique({
      where: {
        projectKey: projectKey
      },
      select: {
        isHidden: true,
        isHiddenReason: true,
        projectKey: true,
        projectNameShort: true,
        projectName: true,
        projectUrl: true,
        projectDescription: true,
        comment: true,
      },
    });

    // If no project found, return null
    if (!projectInfoRes) {
      return null;
    }

    // Transform data into desired format
    const projectInfo = {
      isHidden: projectInfoRes.isHidden,
      isHiddenReason: projectInfoRes.isHiddenReason,
      projectKey: projectInfoRes.projectKey,
      projectNameShort: projectInfoRes.projectNameShort,
      projectName: projectInfoRes.projectName,
      projectUrl: projectInfoRes.projectUrl,
      projectDescription: projectInfoRes.projectDescription,
      comment: projectInfoRes.comment,
    };

    // Return the transformed project info
    return projectInfo;

  } catch (error) {
    logger.error({ err: error, projectKey }, 'getProjectInfos failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// CREATE
// ------------------------------------------------------------------------------

export async function createProject(
  data: {
    isHidden?: boolean;
    isHiddenReason?: string | null;
    projectKey: string;
    projectNameShort: string;
    projectName: string;
    projectUrl?: string | null;
    projectDescription?: string | null;
    comment?: string | null;
  },
  userId: number
) {
  try {
    // Fetch existing project
    const existing = await prisma.projects.findUnique({
      where: { projectKey: data.projectKey }
    });

    // Proactive check
    if (existing) {
      throw new Error('Project key already exists');
    }

    // Create project
    const createdProject = await prisma.projects.create({
      data: {
        ...data,
        userId: userId
      },
    });

    const batchId = crypto.randomUUID();

    // Create changelog entry for creation
    await logChangelog({
      tableName: TableNamesEnum.projects,
      recordId: createdProject.projectId,
      recordName: createdProject.projectKey,
      action: ChangeActionEnum.CREATED,
      field: '__created__',
      oldValue: undefined,
      newValue: JSON.stringify(data),
      comment: undefined,
      batchId: batchId,
      userId: userId,
    });

    // Return the created project
    revalidateTag(PROJECTS_CACHE_TAG, { expire: 0 });
    return createdProject;

  } catch (error) {
    logger.error({ err: error }, 'createProject failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// UPDATE
// ------------------------------------------------------------------------------

export async function updateProject(
  projectKey: string,
  data: {
    isHidden?: boolean;
    isHiddenReason?: string | null;
    projectNameShort?: string;
    projectName?: string;
    projectUrl?: string | null;
    projectDescription?: string | null;
    comment?: string | null;
  },
  userId: number,
) {
  try {
    // Fetch existing project
    const existingProject = await prisma.projects.findUnique({
      where: { projectKey },
    });

    // Proactive check
    if (!existingProject) {
      throw new Error("Project not found");
    }

    // Compare changes
    const changedFields: {
      field: string;
      oldValue: string | undefined;
      newValue: string | undefined;
    }[] = [];

    for (const key in data) {
      const oldVal = (existingProject as Record<string, unknown>)[key];
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

    // If no changes detected, just return existing project
    if (changedFields.length === 0) {
      return existingProject;
    }

    const batchId = crypto.randomUUID();

    // Perform update atomically, then log changelog entries after
    const updatedProject = await prisma.projects.update({
      where: { projectKey },
      data: {
        ...data,
      },
    });

    // Log changelog entries after the update
    await Promise.all(
      changedFields.map(change =>
        logChangelog({
          tableName: TableNamesEnum.projects,
          recordId: existingProject.projectId,
          recordName: existingProject.projectKey,
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

    // Return the updated project
    revalidateTag(PROJECTS_CACHE_TAG, { expire: 0 });
    return updatedProject;

  } catch (error) {
    logger.error({ err: error }, 'updateProject failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// DELETE
// ------------------------------------------------------------------------------

export async function deleteProject(projectKey: string, userId: number, comment?: string) {
  try {
    // Fetch existing project
    const existingProject = await prisma.projects.findUnique({
      where: { projectKey },
    });
    // Proactive check
    if (!existingProject) {
      throw new Error("Project not found");
    }

    // Check for existing datasets
    const count = await prisma.datasets.count({ where: { projectKey } });
    if (count > 0) {
      throw new Error(`Cannot delete project. ${count} datasets still exist.`);
    }

    const batchId = crypto.randomUUID();

    // Delete project
    await prisma.projects.delete({
      where: { projectKey: projectKey },
    });

    // Create changelog entry for deletion before deleting
    await logChangelog({
      tableName: TableNamesEnum.projects,
      recordId: existingProject.projectId,
      recordName: existingProject.projectKey,
      action: ChangeActionEnum.DELETED,
      field: '__deleted__',
      oldValue: JSON.stringify(existingProject),
      newValue: undefined,
      comment: comment?.trim() || undefined,
      batchId: batchId,
      userId: userId,
    });

    // Return the deleted project data
    revalidateTag(PROJECTS_CACHE_TAG, { expire: 0 });
    return existingProject;

  } catch (error) {
    logger.error({ err: error }, 'deleteProject failed');
    throw error;
  }
}