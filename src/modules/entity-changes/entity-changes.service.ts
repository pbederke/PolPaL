import 'server-only';
import { ChangeActionEnum, EntityChangesEnum, TableNamesEnum } from "@/lib/shared/enums";
import { prisma } from "@/lib/server/prisma.server";
import logger from "@/lib/server/logger.server";
import { logChangelog } from "@/lib/server/changelogLogger";

// ------------------------------------------------------------------------------
// CREATE
// ------------------------------------------------------------------------------

export async function createEntityChange(
  userId: number,
  data: {
    polpalIdOld: number;
    polpalIdNew: number;
    changeYear: number;
    changeMonth: number | null;
    changeDay: number | null;
    changeType: EntityChangesEnum;
    comment: string | null;
  },

) {
  try {
    const [entityOld, entityNew] = await Promise.all([
      prisma.entities.findUnique({
        where: { polpalId: data.polpalIdOld },
        select: { polpalId: true, entityType: true, nameEnglish: true },
      }),
      prisma.entities.findUnique({
        where: { polpalId: data.polpalIdNew },
        select: { polpalId: true, entityType: true, nameEnglish: true },
      }),
    ]);

    if (!entityOld || entityOld.entityType === 'GROUPING') {
      throw new Error('Invalid entity ID (old) or not of type PARTY');
    }
    if (!entityNew || entityNew.entityType === 'GROUPING') {
      throw new Error('Invalid entity ID (new) or not of type PARTY');
    }

    const createdEntityChange = await prisma.entityChanges.create({
      data: {
        polpalIdOld: entityOld.polpalId,
        polpalIdNew: entityNew.polpalId,
        changeYear: data.changeYear,
        changeMonth: data.changeMonth,
        changeDay: data.changeDay,
        changeType: data.changeType,
        comment: data.comment,
        userId: userId,
      },
    });

    const batchId = crypto.randomUUID();

    // Create changelog entry for creation
    await logChangelog({
      tableName: TableNamesEnum.entityChanges,
      recordId: createdEntityChange.entityChangeId,
      recordName: `${entityOld.nameEnglish} (${entityOld?.polpalId}) changed to ${entityNew.nameEnglish} (${entityNew?.polpalId})`,
      action: ChangeActionEnum.CREATED,
      field: '__created__',
      oldValue: undefined,
      newValue: JSON.stringify(data),
      comment: undefined,
      batchId: batchId,
      userId: userId,
    });

    return createdEntityChange;
  } catch (error) {
    logger.error({ err: error }, 'createEntityChange failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// UPDATE
// ------------------------------------------------------------------------------

export async function updateEntityChange(
  entityChangeId: number,
  userId: number,
  data: {
    changeYear: number;
    changeMonth: number | null;
    changeDay: number | null;
    comment: string | null;
  },
) {
  try {
    const existingEntityChange = await prisma.entityChanges.findUnique({
      where: { entityChangeId: entityChangeId },
    });

    if (!existingEntityChange) {
      throw new Error("Entity change not found");
    }

    const updatedEntityChange = await prisma.entityChanges.update({
      where: { entityChangeId: entityChangeId },
      data: {
        changeYear: data.changeYear,
        changeMonth: data.changeMonth,
        changeDay: data.changeDay,
        comment: data.comment,
      },
    });

    const batchId = crypto.randomUUID();

    const changedFields: { field: string; oldValue: string; newValue: string }[] = [];
    if (existingEntityChange.changeYear !== data.changeYear) {
      changedFields.push({ field: 'changeYear', oldValue: String(existingEntityChange.changeYear), newValue: String(data.changeYear) });
    }
    if (existingEntityChange.changeMonth !== data.changeMonth) {
      changedFields.push({ field: 'changeMonth', oldValue: existingEntityChange.changeMonth?.toString() ?? 'null', newValue: data.changeMonth?.toString() ?? 'null' });
    }
    if (existingEntityChange.changeDay !== data.changeDay) {
      changedFields.push({ field: 'changeDay', oldValue: existingEntityChange.changeDay?.toString() ?? 'null', newValue: data.changeDay?.toString() ?? 'null' });
    }
    if (existingEntityChange.comment !== data.comment) {
      changedFields.push({ field: 'comment', oldValue: existingEntityChange.comment ?? 'null', newValue: data.comment ?? 'null' });
    }

    for (const change of changedFields) {
      await logChangelog({
        tableName: TableNamesEnum.entityChanges,
        recordId: existingEntityChange.entityChangeId,
        recordName: `Entity change #${existingEntityChange.entityChangeId}`,
        action: ChangeActionEnum.UPDATED,
        field: change.field,
        oldValue: change.oldValue,
        newValue: change.newValue,
        batchId: batchId,
        userId: userId,
      });
    }

    return updatedEntityChange;
  } catch (error) {
    logger.error({ err: error, entityChangeId }, 'updateEntityChange failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// DELETE
// ------------------------------------------------------------------------------

export async function deleteEntityChange(entityChangeId: number, userId: number, comment?: string) {
  try {
    const existingEntityChange = await prisma.entityChanges.findUnique({
      where: { entityChangeId: entityChangeId },
    });

    if (!existingEntityChange) {
      throw new Error("Entity change not found");
    }

    const entityOld = await prisma.entities.findUnique({ where: { polpalId: existingEntityChange.polpalIdOld } });
    const entityNew = await prisma.entities.findUnique({ where: { polpalId: existingEntityChange.polpalIdNew } });

    await prisma.entityChanges.delete({
      where: { entityChangeId: entityChangeId },
    });

    const batchId = crypto.randomUUID();

    // Create changelog entry for deletion before deleting
    await logChangelog({
      tableName: TableNamesEnum.entityChanges,
      recordId: entityChangeId,
      recordName: `${entityOld?.nameEnglish} (${entityOld?.polpalId}) changed to ${entityNew?.nameEnglish} (${entityNew?.polpalId})`,
      action: ChangeActionEnum.DELETED,
      field: '__deleted__',
      oldValue: JSON.stringify(existingEntityChange),
      newValue: undefined,
      comment: comment?.trim() || undefined,
      batchId: batchId,
      userId: userId,
    });
  } catch (error) {
    logger.error({ err: error, entityChangeId }, 'deleteEntityChange failed');
    throw error;
  }
} 