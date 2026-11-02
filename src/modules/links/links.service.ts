import 'server-only';
import { ChangeActionEnum, TableNamesEnum } from "@/lib/shared/enums";
import { prisma } from "@/lib/server/prisma.server";
import logger from "@/lib/server/logger.server";
import { logChangelog, logChangelogMany } from "@/lib/server/changelogLogger";

// ------------------------------------------------------------------------------
// Create link
// ------------------------------------------------------------------------------

export async function createLink(
  data: {
    polpalId: number;
    uniqueObservationId: string;
    startYear?: number | null;
    startMonth?: number | null;
    startDay?: number | null;
    endYear?: number | null;
    endMonth?: number | null;
    endDay?: number | null;
    comment?: string | null;
  },
  userId: number,
) {
  try {
    const existing = await prisma.linksEntryToEntity.findUnique({
      where: {
        uniqueObservationId_polpalId: {
          uniqueObservationId: data.uniqueObservationId,
          polpalId: data.polpalId,
        },
      },
    });

    if (existing) {
      return existing;
    }

    const createdLink = await prisma.linksEntryToEntity.create({
      data: {
        polpalId: data.polpalId,
        uniqueObservationId: data.uniqueObservationId,
        startYear: data.startYear,
        startMonth: data.startMonth,
        startDay: data.startDay,
        endYear: data.endYear,
        endMonth: data.endMonth,
        endDay: data.endDay,
        comment: data.comment,
        userId,
      }
    });

    const batchId = crypto.randomUUID();

    await logChangelog({
      tableName: TableNamesEnum.linksEntriesToEntities,
      recordId: createdLink.linkEntriesToEntityId,
      recordName: data.uniqueObservationId,
      action: ChangeActionEnum.CREATED,
      field: '__created__',
      newValue: JSON.stringify(data),
      comment: undefined,
      batchId: batchId,
      userId: userId,
    });

    return createdLink;
  } catch (error) {
    logger.error({ err: error, uniqueObservationId: data.uniqueObservationId }, 'createLink failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// Delete link by entry
// ------------------------------------------------------------------------------

export async function deleteLinkByEntry(uniqueObservationId: string, userId?: number) {
  try {
    const linksToDelete = await prisma.linksEntryToEntity.findMany({
      where: { uniqueObservationId },
    });
    const batchId = crypto.randomUUID();
    await logChangelogMany(
      linksToDelete.map(link => ({
        tableName: TableNamesEnum.linksEntriesToEntities,
        recordId: link.linkEntriesToEntityId,
        recordName: link.uniqueObservationId,
        action: ChangeActionEnum.DELETED,
        field: '__deleted__',
        oldValue: JSON.stringify(link),
        comment: undefined,
        batchId: batchId,
        userId: userId,
      }))
    );
    await prisma.linksEntryToEntity.deleteMany({
      where: {
        uniqueObservationId: uniqueObservationId,
      },
    });
  } catch (error) {
    logger.error({ err: error, uniqueObservationId }, 'deleteLinkByEntry failed');
    throw error;
  }
}


// ------------------------------------------------------------------------------
// Delete link by entry bulk
// ------------------------------------------------------------------------------

export async function deleteLinkByEntryBulk(listUniqueObservationIds: string[], userId?: number) {
  try {
    const linksToDelete = await prisma.linksEntryToEntity.findMany({
      where: {
        uniqueObservationId: {
          in: listUniqueObservationIds,
        },
      },
    });
    const batchId = crypto.randomUUID();
    await logChangelogMany(
      linksToDelete.map(link => ({
        tableName: TableNamesEnum.linksEntriesToEntities,
        recordId: link.linkEntriesToEntityId,
        recordName: link.uniqueObservationId,
        action: ChangeActionEnum.DELETED,
        field: '__deleted__',
        oldValue: JSON.stringify(link),
        comment: undefined,
        batchId: batchId,
        bulk: true,
        userId: userId,
      }))
    );
    await prisma.linksEntryToEntity.deleteMany({
      where: {
        uniqueObservationId: {
          in: listUniqueObservationIds,
        },
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'deleteLinkByEntryBulk failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// Delete link by entries and polpalId
// ------------------------------------------------------------------------------

export async function deleteLinkByEntriesAndPolpalId(uniqueObservationIds: string[], polpalId: number, userId?: number) {
  try {
    const linksToDelete = await prisma.linksEntryToEntity.findMany({
      where: {
        uniqueObservationId: { in: uniqueObservationIds },
        polpalId,
      },
    });
    const batchId = crypto.randomUUID();
    await logChangelogMany(
      linksToDelete.map(link => ({
        tableName: TableNamesEnum.linksEntriesToEntities,
        recordId: link.linkEntriesToEntityId,
        recordName: link.uniqueObservationId,
        action: ChangeActionEnum.DELETED,
        field: '__deleted__',
        oldValue: JSON.stringify(link),
        comment: undefined,
        batchId: batchId,
        userId: userId,
      }))
    );
    await prisma.linksEntryToEntity.deleteMany({
      where: {
        uniqueObservationId: { in: uniqueObservationIds },
        polpalId,
      },
    });
  } catch (error) {
    logger.error({ err: error, polpalId }, 'deleteLinkByEntriesAndPolpalId failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// Create links in bulk
// ------------------------------------------------------------------------------

export async function createLinksBulk(
  entries: { uniqueObservationIds: string[]; polpalId: number }[],
  userId: number,
) {
  try {
    const batchId = crypto.randomUUID();

    // Flatten all entries into individual link rows
    const linkRows = entries.flatMap(entry =>
      entry.uniqueObservationIds.map(uniqueObservationId => ({
        polpalId: entry.polpalId,
        uniqueObservationId,
        startYear: null as number | null,
        startMonth: null as number | null,
        startDay: null as number | null,
        endYear: null as number | null,
        endMonth: null as number | null,
        endDay: null as number | null,
        userId,
      }))
    );

    const result = await prisma.$transaction(async (tx) => {
      // Bulk insert all links in a single query
      const created = await tx.linksEntryToEntity.createManyAndReturn({
        data: linkRows,
      });

      // Bulk insert all changelog entries
      await tx.changelog.createMany({
        data: created.map(link => ({
          tableName: TableNamesEnum.linksEntriesToEntities,
          recordId: link.linkEntriesToEntityId,
          recordName: link.uniqueObservationId,
          action: ChangeActionEnum.CREATED,
          field: '__created__',
          newValue: JSON.stringify({
            polpalId: link.polpalId,
            uniqueObservationId: link.uniqueObservationId,
          }),
          comment: undefined,
          batchId,
          bulk: true,
          userId: userId,
        })),
      });

      return created;
    });

    return { created: result.length, batchId };
  } catch (error) {
    logger.error({ err: error, userId }, 'createLinksBulk failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// Get links by PolPal ID
// ------------------------------------------------------------------------------
export async function getLinksByPolPalId(polpalId: number) {
  try {
    return await prisma.linksEntryToEntity.findMany({
      where: { polpalId },
    });
  } catch (error) {
    logger.error({ err: error, polpalId }, 'getLinksByPolPalId failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// Bulk-create auto-links with full metadata (for version-to-version auto-linking)
// ------------------------------------------------------------------------------

export type AutoLinkRow = {
  uniqueObservationId: string;
  polpalId: number;
  startYear?: number | null;
  startMonth?: number | null;
  startDay?: number | null;
  endYear?: number | null;
  endMonth?: number | null;
  endDay?: number | null;
  comment?: string | null;
};

export async function createAutoLinksBulk(links: AutoLinkRow[], userId: number) {
  if (links.length === 0) return { created: 0, batchId: crypto.randomUUID() };

  try {
    const batchId = crypto.randomUUID();

    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.linksEntryToEntity.createManyAndReturn({
        data: links.map((l) => ({
          uniqueObservationId: l.uniqueObservationId,
          polpalId: l.polpalId,
          startYear: l.startYear ?? null,
          startMonth: l.startMonth ?? null,
          startDay: l.startDay ?? null,
          endYear: l.endYear ?? null,
          endMonth: l.endMonth ?? null,
          endDay: l.endDay ?? null,
          comment: l.comment ?? null,
          userId,
        })),
        skipDuplicates: true,
      });

      await tx.changelog.createMany({
        data: created.map((link) => ({
          tableName: TableNamesEnum.linksEntriesToEntities,
          recordId: link.linkEntriesToEntityId,
          recordName: link.uniqueObservationId,
          action: ChangeActionEnum.CREATED,
          field: '__created__',
          newValue: JSON.stringify({ polpalId: link.polpalId, uniqueObservationId: link.uniqueObservationId }),
          comment: undefined,
          batchId,
          bulk: true,
          userId,
        })),
      });

      return created;
    });

    return { created: result.length, batchId };
  } catch (error) {
    logger.error({ err: error, userId }, 'createAutoLinksBulk failed');
    throw error;
  }
}