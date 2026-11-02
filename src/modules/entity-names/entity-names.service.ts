import 'server-only';
import { TableNamesEnum, ChangeActionEnum, LanguageCodeEnum } from "@/lib/shared/enums";
import { prisma } from "@/lib/server/prisma.server";
import logger from "@/lib/server/logger.server";
import { logChangelog } from "@/lib/server/changelogLogger";

// -------------------------------------------------------------------------
// PARTY NAMES
// -------------------------------------------------------------------------

// ------------------------------------------------------------------------------
// GET by PolPaL ID
// ------------------------------------------------------------------------------

export async function getEntityNamesByPolpalId(polpalId: number) {
  try {
    return await prisma.entityNames.findMany({
      where: { polpalId: polpalId },
    });
  } catch (error) {
    logger.error({ err: error, polpalId }, 'getEntityNamesByPolpalId failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// CREATE
// ------------------------------------------------------------------------------

export async function createEntityName(
  userId: number,
  nameData: {
    polpalId: number;
    nameShort: string;
    name: string;
    language: string;
    comment?: string | null;
    startYear?: number | null;
    startMonth?: number | null;
    startDay?: number | null;
    endYear?: number | null;
    endMonth?: number | null;
    endDay?: number | null;
    source?: string[] | null;
  }
) {
  try {
    const createdEntityName = await prisma.entityNames.create({
      data: {
        polpalId: nameData.polpalId,
        nameShort: nameData.nameShort,
        name: nameData.name,
        language: nameData.language as LanguageCodeEnum,
        comment: nameData.comment,
        startYear: nameData.startYear,
        startMonth: nameData.startMonth,
        startDay: nameData.startDay,
        endYear: nameData.endYear,
        endMonth: nameData.endMonth,
        endDay: nameData.endDay,
        userId: userId,
      },
    });

    const batchId = crypto.randomUUID();

    // Create changelog entry for creation
    await logChangelog({
      tableName: TableNamesEnum.entityNames,
      recordId: createdEntityName.entityNameId,
      recordName: `${createdEntityName.name} (${createdEntityName?.polpalId})`,
      action: ChangeActionEnum.CREATED,
      field: '__created__',
      oldValue: undefined,
      newValue: JSON.stringify(nameData),
      comment: undefined,
      batchId: batchId,
      userId: userId,
    });

    return createdEntityName;
  } catch (error) {
    logger.error({ err: error, polpalId: nameData.polpalId }, 'createEntityName failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// UPDATE
// ------------------------------------------------------------------------------

export async function updateEntityName(
  entityNameId: number,
  userId: number,
  data: {
    nameShort?: string;
    name?: string;
    language?: string;
    comment?: string | null;
    startYear?: number | null;
    startMonth?: number | null;
    startDay?: number | null;
    endYear?: number | null;
    endMonth?: number | null;
    endDay?: number | null;
  },
) {
  try {
    const existingEntityName = await prisma.entityNames.findUnique({
      where: { entityNameId: entityNameId },
    });

    if (!existingEntityName) {
      throw new Error("Entity name not found");
    }

    const updateData: Record<string, string | number | null> = {};
    for (const key of ['nameShort', 'name', 'language', 'comment', 'startYear', 'startMonth', 'startDay', 'endYear', 'endMonth', 'endDay'] as const) {
      if (key in data) {
        updateData[key] = data[key] ?? null;
      }
    }
    if (updateData.language !== undefined) {
      updateData.language = updateData.language as LanguageCodeEnum;
    }

    const updatedEntityName = await prisma.entityNames.update({
      where: { entityNameId: entityNameId },
      data: {
        ...updateData,
        userId: userId,
      },
    });

    const batchId = crypto.randomUUID();

    const changedFields: { field: string; oldValue: string; newValue: string }[] = [];
    for (const key of Object.keys(updateData) as (keyof typeof updateData)[]) {
      const oldVal = (existingEntityName as unknown as Record<string, unknown>)[key];
      const newVal = updateData[key];
      if (oldVal !== newVal) {
        changedFields.push({
          field: key,
          oldValue: oldVal?.toString() ?? 'null',
          newValue: newVal?.toString() ?? 'null',
        });
      }
    }

    for (const change of changedFields) {
      await logChangelog({
        tableName: TableNamesEnum.entityNames,
        recordId: existingEntityName.entityNameId,
        recordName: `${existingEntityName.name} (${existingEntityName.polpalId})`,
        action: ChangeActionEnum.UPDATED,
        field: change.field,
        oldValue: change.oldValue,
        newValue: change.newValue,
        batchId: batchId,
        userId: userId,
      });
    }

    return updatedEntityName;
  } catch (error) {
    logger.error({ err: error, entityNameId }, 'updateEntityName failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// DELETE
// ------------------------------------------------------------------------------

export async function deleteEntityName(entityNameId: number, userId: number, comment?: string) {
  try {
    const existingEntityName = await prisma.entityNames.findUnique({
      where: { entityNameId: entityNameId },
    });

    if (!existingEntityName) {
      throw new Error("Entity name not found");
    }

    await prisma.entityNames.delete({
      where: { entityNameId: entityNameId },
    });

    const batchId = crypto.randomUUID();

    // Create changelog entry for deletion before deleting
    await logChangelog({
      tableName: TableNamesEnum.entityNames,
      recordId: entityNameId,
      recordName: `${existingEntityName.name} (${existingEntityName.polpalId})`,
      action: ChangeActionEnum.DELETED,
      field: '__deleted__',
      oldValue: JSON.stringify(existingEntityName),
      newValue: undefined,
      comment: comment?.trim() || undefined,
      batchId: batchId,
      userId: userId,
    });
  } catch (error) {
    logger.error({ err: error, entityNameId }, 'deleteEntityName failed');
    throw error;
  }
} 