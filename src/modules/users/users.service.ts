import 'server-only';
import { prisma } from "@/lib/server/prisma.server";
import logger from "@/lib/server/logger.server";
import bcrypt from 'bcrypt';


// ------------------------------------------------------------------------------
// Get by userId
// ------------------------------------------------------------------------------

export async function getUserById(userId: number) {
  try {
    return await prisma.users.findUnique({
      where: { userId: userId },
      select: {
        userId: true,
        nameFirst: true,
        nameLast: true,
        email: true,
        username: true,
        role: true,
        approvedByAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    logger.error({ err: error, userId }, 'getUserById failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// Get entities created by userId
// ------------------------------------------------------------------------------

export async function countEntitiesByUser(userId: number) {
  try {
    return await prisma.entities.count({ where: { userId } });
  } catch (error) {
    logger.error({ err: error, userId }, 'countEntitiesByUser failed');
    throw error;
  }
}

export async function getEntitiesByUser(userId: number, limit?: number) {
  try {
    return await prisma.entities.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit ?? 1000, 1000),
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
        EntitiesInCountries: {
          select: {
            countrycodePolpal: true,
            Countries: { select: { countryname: true } },
          },
        },
      },
    });
  } catch (error) {
    logger.error({ err: error, userId }, 'getEntitiesByUser failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// Get links created by userId
// ------------------------------------------------------------------------------

// ------------------------------------------------------------------------------
// Get lightweight summary of project/dataset/version combinations for userId
// ------------------------------------------------------------------------------
export async function getLinksSummaryByUser(userId: number) {
  try {
    const rows = await prisma.linksEntryToEntity.findMany({
      where: { userId },
      select: {
        Entries: {
          select: {
            projectKey: true,
            datasetKey: true,
            versionKey: true,
            Projects: { select: { projectNameShort: true, projectName: true } },
            Datasets: { select: { datasetNameShort: true, datasetName: true } },
            Versions: { select: { version: true, versionName: true } },
          },
        },
      },
    });

    const seen = new Set<string>();
    return rows
      .map((r) => r.Entries)
      .filter((e): e is NonNullable<typeof e> => e != null)
      .filter((e) => {
        const key = `${e.projectKey}|${e.datasetKey}|${e.versionKey}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((e) => ({
        projectKey: e.projectKey,
        projectNameShort: e.Projects.projectNameShort,
        projectName: e.Projects.projectName,
        datasetKey: e.datasetKey,
        datasetNameShort: e.Datasets.datasetNameShort,
        datasetName: e.Datasets.datasetName,
        versionKey: e.versionKey,
        version: e.Versions.version,
        versionName: e.Versions.versionName,
      }));
  } catch (error) {
    logger.error({ err: error, userId }, 'getLinksSummaryByUser failed');
    throw error;
  }
}

export async function countLinksByUser(userId: number) {
  try {
    return await prisma.linksEntryToEntity.count({ where: { userId } });
  } catch (error) {
    logger.error({ err: error, userId }, 'countLinksByUser failed');
    throw error;
  }
}

export async function getLinksByUser(userId: number, versionKey?: string, limit?: number) {
  try {
    return await prisma.linksEntryToEntity.findMany({
      where: { userId, ...(versionKey ? { Entries: { versionKey } } : {}) },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit ?? 1000, 1000),
      select: {
        linkEntriesToEntityId: true,
        startYear: true,
        startMonth: true,
        startDay: true,
        endYear: true,
        endMonth: true,
        endDay: true,
        Entries: {
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
            projectKey: true,
            datasetKey: true,
            versionKey: true,
            countrycodePolpal: true,
            Countries: { select: { countryname: true } },
            Projects: { select: { projectNameShort: true, projectName: true } },
            Datasets: { select: { datasetNameShort: true, datasetName: true } },
            Versions: { select: { version: true, versionName: true } },
          },
        },
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
      },
    });
  } catch (error) {
    logger.error({ err: error, userId }, 'getLinksByUser failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// Get validated links summary (distinct project/dataset/version) for userId
// ------------------------------------------------------------------------------
export async function getValidatedLinksSummaryByUser(userId: number) {
  try {
    const rows = await prisma.validationLinks.findMany({
      where: { userId },
      select: {
        Link: {
          select: {
            Entries: {
              select: {
                projectKey: true,
                datasetKey: true,
                versionKey: true,
                Projects: { select: { projectNameShort: true, projectName: true } },
                Datasets: { select: { datasetNameShort: true, datasetName: true } },
                Versions: { select: { version: true, versionName: true } },
              },
            },
          },
        },
      },
    });

    const seen = new Set<string>();
    return rows
      .map((r) => r.Link.Entries)
      .filter((e): e is NonNullable<typeof e> => e != null)
      .filter((e) => {
        const key = `${e.projectKey}|${e.datasetKey}|${e.versionKey}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((e) => ({
        projectKey: e.projectKey,
        projectNameShort: e.Projects.projectNameShort,
        projectName: e.Projects.projectName,
        datasetKey: e.datasetKey,
        datasetNameShort: e.Datasets.datasetNameShort,
        datasetName: e.Datasets.datasetName,
        versionKey: e.versionKey,
        version: e.Versions.version,
        versionName: e.Versions.versionName,
      }));
  } catch (error) {
    logger.error({ err: error, userId }, 'getValidatedLinksSummaryByUser failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// Get validated links for userId (optionally filtered by versionKey)
// ------------------------------------------------------------------------------
export async function countValidatedLinksByUser(userId: number) {
  try {
    return await prisma.validationLinks.count({ where: { userId } });
  } catch (error) {
    logger.error({ err: error, userId }, 'countValidatedLinksByUser failed');
    throw error;
  }
}

export async function getValidatedLinksByUser(userId: number, versionKey?: string, limit?: number) {
  try {
    return await prisma.validationLinks.findMany({
      where: { userId, ...(versionKey ? { Link: { Entries: { versionKey } } } : {}) },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit ?? 1000, 1000),
      select: {
        validationId: true,
        validated: true,
        comment: true,
        Link: {
          select: {
            linkEntriesToEntityId: true,
            startYear: true,
            startMonth: true,
            startDay: true,
            endYear: true,
            endMonth: true,
            endDay: true,
            Entries: {
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
                countrycodePolpal: true,
                Countries: { select: { countryname: true } },
              },
            },
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
          },
        },
      },
    });
  } catch (error) {
    logger.error({ err: error, userId }, 'getValidatedLinksByUser failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// UPDATE password
// ------------------------------------------------------------------------------
export async function updatePassword(userId: number, oldPassword: string, newPassword: string) {
  try {
    const existingUser = await prisma.users.findUnique({
      where: {
        userId: userId
      },
    });

    if (!existingUser || !await bcrypt.compare(oldPassword, existingUser.password)) {
      throw new Error('Invalid credentials');
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    await prisma.users.update({
      where: { userId: userId },
      data: {
        password: hashedNewPassword,
        tokenVersion: { increment: 1 }, // invalidate existing JWTs on other devices
      },
    });
    return { success: true };
  } catch (error) {
    logger.error({ err: error, userId }, 'updatePassword failed');
    throw error;
  }
};
