import 'server-only';
import { prisma } from '@/lib/server/prisma.server';
import logger from '@/lib/server/logger.server';
import { ValidationEnum } from '@/lib/shared/enums';

interface UpsertValidationInput {
  linkId: number;
  userId: number;
  validated: ValidationEnum;
  comment?: string | null;
}

export async function upsertLinkValidation(data: UpsertValidationInput) {
  try {
    const existingLink = await prisma.linksEntryToEntity.findUnique({
      where: { linkEntriesToEntityId: data.linkId },
      select: { linkEntriesToEntityId: true, userId: true },
    });

    if (!existingLink) {
      throw new Error('Link not found');
    }

    if (existingLink.userId !== null && existingLink.userId === data.userId) {
      throw new Error('Cannot validate own link');
    }

    const verification = await prisma.validationLinks.upsert({
      where: {
        linkId_userId: {
          linkId: data.linkId,
          userId: data.userId,
        },
      },
      update: {
        validated: data.validated,
        comment: data.comment ?? null,
      },
      create: {
        linkId: data.linkId,
        userId: data.userId,
        validated: data.validated,
        comment: data.comment ?? null,
      },
    });

    const [approvedCount, rejectedCount] = await Promise.all([
      prisma.validationLinks.count({
        where: {
          linkId: data.linkId,
          validated: ValidationEnum.APPROVED,
        },
      }),
      prisma.validationLinks.count({
        where: {
          linkId: data.linkId,
          validated: ValidationEnum.REJECTED,
        },
      }),
    ]);

    return {
      verification,
      summary: {
        linkId: data.linkId,
        approvedCount,
        rejectedCount,
      },
    };
  } catch (error) {
    logger.error({ err: error, linkId: data.linkId }, 'upsertLinkValidation failed');
    throw error;
  }
}

export async function getLinkVerificationSummary(linkId: number) {
  try {
    const existingLink = await prisma.linksEntryToEntity.findUnique({
      where: { linkEntriesToEntityId: linkId },
      select: { linkEntriesToEntityId: true },
    });

    if (!existingLink) {
      throw new Error('Link not found');
    }

    const [approvedCount, rejectedCount, votes] = await Promise.all([
      prisma.validationLinks.count({
        where: {
          linkId,
          validated: ValidationEnum.APPROVED,
        },
      }),
      prisma.validationLinks.count({
        where: {
          linkId,
          validated: ValidationEnum.REJECTED,
        },
      }),
      prisma.validationLinks.findMany({
        where: { linkId },
        select: {
          validationId: true,
          validated: true,
          comment: true,
          createdAt: true,
          updatedAt: true,
          userId: true,
        },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return {
      linkId,
      approvedCount,
      rejectedCount,
      votes,
    };
  } catch (error) {
    logger.error({ err: error, linkId }, 'getLinkVerificationSummary failed');
    throw error;
  }
}

export async function deleteVerification(linkId: number, userId: number) {
  try {
    await prisma.validationLinks.deleteMany({
      where: { linkId, userId },
    });

    const [approvedCount, rejectedCount] = await Promise.all([
      prisma.validationLinks.count({
        where: { linkId, validated: ValidationEnum.APPROVED },
      }),
      prisma.validationLinks.count({
        where: { linkId, validated: ValidationEnum.REJECTED },
      }),
    ]);

    return {
      summary: { linkId, approvedCount, rejectedCount },
    };
  } catch (error) {
    logger.error({ err: error, linkId }, 'deleteVerification failed');
    throw error;
  }
}

export async function getRejectedValidations() {
  try {
    const data = await prisma.entries.findMany({
    where: {
      LinksEntryToEntity: {
        some: {
          ValidationLinks: {
            some: { validated: ValidationEnum.REJECTED },
          },
        },
      },
    },
    select: {
      entryId: true,
      entryYear: true,
      entryMonth: true,
      entryDay: true,
      entryEntityIdVar: true,
      entryEntityId: true,
      uniqueObservationId: true,
      entryEntityNameShort: true,
      entryEntityNameEnglish: true,
      entryEntityName: true,
      countrycodePolpal: true,
      versionKey: true,
      Countries: { select: { countryname: true, iso2c: true } },
      Projects: { select: { projectNameShort: true } },
      Datasets: { select: { datasetNameShort: true } },
      Versions: { select: { version: true } },
      LinksEntryToEntity: {
        where: {
          ValidationLinks: {
            some: { validated: ValidationEnum.REJECTED },
          },
        },
        select: {
          linkEntriesToEntityId: true,
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
            where: { validated: ValidationEnum.REJECTED },
            select: {
              validated: true,
              comment: true,
            },
          },
        },
      },
    },
    orderBy: { entryId: 'desc' },
    take: 1000,
    });

    return data.map(({ Countries, ...rest }) => ({
      ...rest,
      countryname: Countries?.countryname ?? null,
      iso2c: Countries?.iso2c ?? null,
    }));
  } catch (error) {
    logger.error({ err: error }, 'getRejectedValidations failed');
    throw error;
  }
}
