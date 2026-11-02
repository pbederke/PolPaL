import 'server-only';

import { ChangeActionEnum, TableNamesEnum } from "@/lib/shared/enums";
import { prisma } from "@/lib/server/prisma.server";
import logger from "@/lib/server/logger.server";
import { logChangelog } from "@/lib/server/changelogLogger";

// ------------------------------------------------------------------------------
// GET by entity ID
// ------------------------------------------------------------------------------

export async function getGroupingMembershipByPolpalId(entityId: number) {
  try {
    return await prisma.groupingMembers.findMany({
      where: {
        entityId: entityId,
        Entities: { isHidden: false },
        Groupings: { isHidden: false },
      },
      select: {
        groupingMemberId: true,
        entityId: true,
        groupingId: true,
        startYear: true,
        startMonth: true,
        startDay: true,
        endYear: true,
        endMonth: true,
        endDay: true,
        comment: true,
        Entities: {
          select: {
            polpalId: true,
            nameShort: true,
            nameEnglish: true,
            entityType: true,
          },
        },
        Groupings: {
          select: {
            polpalId: true,
            nameShort: true,
            nameEnglish: true,
            entityType: true,
          },
        },
      },
    });
  } catch (error) {
    logger.error({ err: error, entityId }, 'getGroupingMembershipByPolpalId failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// GET by grouping ID
// ------------------------------------------------------------------------------

export async function getGroupingMembersByGroupingId(groupingId: number) {
  try {
    return await prisma.groupingMembers.findMany({
      where: {
        groupingId: groupingId,
        Entities: { isHidden: false },
        Groupings: { isHidden: false },
      },
      select: {
        groupingMemberId: true,
        entityId: true,
        groupingId: true,
        startYear: true,
        startMonth: true,
        startDay: true,
        endYear: true,
        endMonth: true,
        endDay: true,
        comment: true,
        Entities: {
          select: {
            polpalId: true,
            nameShort: true,
            nameEnglish: true,
            entityType: true,
          },
        },
        Groupings: {
          select: {
            polpalId: true,
            nameShort: true,
            nameEnglish: true,
            entityType: true,
          },
        },
      },
    });
  } catch (error) {
    logger.error({ err: error, groupingId }, 'getGroupingMembersByGroupingId failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// CREATE
// ------------------------------------------------------------------------------

export async function createGroupingMember(
  userId: number,
  data: {
    entityId: number;
    groupingId: number;
    startYear: number;
    startMonth?: number | null;
    startDay?: number | null;
    endYear?: number | null;
    endMonth?: number | null;
    endDay?: number | null;
    comment?: string | null;
  },

) {
  try {
    const entity = await prisma.entities.findUnique({ where: { polpalId: data.entityId } });
    const grouping = await prisma.entities.findUnique({ where: { polpalId: data.groupingId } });

    if (!entity) {
      throw new Error('Invalid entity ID or not of type PARTY');
    }
    if (!grouping || grouping.entityType !== 'GROUPING') {
      throw new Error('Invalid grouping ID or not of type GROUPING');
    }

    const createdGroupingMember = await prisma.groupingMembers.create({
      data: {
        entityId: data.entityId,
        groupingId: data.groupingId,
        startYear: data.startYear,
        startMonth: data.startMonth,
        startDay: data.startDay,
        endYear: data.endYear,
        endMonth: data.endMonth,
        endDay: data.endDay,
        comment: data.comment,
        userId: userId,
      },
    });

    const batchId = crypto.randomUUID();

    // Create changelog entry for creation
    await logChangelog({
      tableName: TableNamesEnum.groupingMembers,
      recordId: createdGroupingMember.groupingMemberId,
      recordName: `${entity.nameEnglish} (${entity.polpalId}) in ${grouping.nameEnglish} (${grouping.polpalId})`,
      action: ChangeActionEnum.CREATED,
      field: '__created__',
      oldValue: undefined,
      newValue: JSON.stringify(data),
      comment: undefined,
      batchId: batchId,
      userId: userId,
    });

    return createdGroupingMember;
  } catch (error) {
    logger.error({ err: error, entityId: data.entityId }, 'createGroupingMember failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// UPDATE
// ------------------------------------------------------------------------------

export async function updateGroupingMember(
  groupingMemberId: number,
  userId: number,
  data: {
    startYear?: number | null;
    startMonth?: number | null;
    startDay?: number | null;
    endYear?: number | null;
    endMonth?: number | null;
    endDay?: number | null;
    comment?: string | null;
  },
) {
  try {
    const existingGroupingMember = await prisma.groupingMembers.findUnique({
      where: { groupingMemberId: groupingMemberId },
    });

    if (!existingGroupingMember) {
      throw new Error("Grouping member not found");
    }

    const updateData: Record<string, number | string | null> = {};
    for (const key of ['startYear', 'startMonth', 'startDay', 'endYear', 'endMonth', 'endDay', 'comment'] as const) {
      if (key in data) {
        updateData[key] = data[key] ?? null;
      }
    }

    const updatedGroupingMember = await prisma.groupingMembers.update({
      where: { groupingMemberId: groupingMemberId },
      data: updateData,
    });

    const batchId = crypto.randomUUID();

    const changedFields: { field: string; oldValue: string; newValue: string }[] = [];
    for (const key of Object.keys(updateData) as (keyof typeof updateData)[]) {
      const oldVal = (existingGroupingMember as unknown as Record<string, unknown>)[key];
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
        tableName: TableNamesEnum.groupingMembers,
        recordId: existingGroupingMember.groupingMemberId,
        recordName: `Grouping member #${existingGroupingMember.groupingMemberId}`,
        action: ChangeActionEnum.UPDATED,
        field: change.field,
        oldValue: change.oldValue,
        newValue: change.newValue,
        batchId: batchId,
        userId: userId,
      });
    }

    return updatedGroupingMember;
  } catch (error) {
    logger.error({ err: error, groupingMemberId }, 'updateGroupingMember failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// DELETE
// ------------------------------------------------------------------------------

export async function deleteGroupingMember(groupingMemberId: number, userId: number, comment?: string) {
  try {
    const existingGroupingMember = await prisma.groupingMembers.findUnique({
      where: { groupingMemberId: groupingMemberId },
    });

    if (!existingGroupingMember) {
      throw new Error("Grouping member not found");
    }

    const entity = await prisma.entities.findUnique({ where: { polpalId: existingGroupingMember.entityId } });
    const grouping = await prisma.entities.findUnique({ where: { polpalId: existingGroupingMember.groupingId } });

    await prisma.groupingMembers.delete({
      where: { groupingMemberId: groupingMemberId },
    });

    const batchId = crypto.randomUUID();

    // Create changelog entry for deletion before deleting
    await logChangelog({
      tableName: TableNamesEnum.groupingMembers,
      recordId: groupingMemberId,
      recordName: `${entity?.nameEnglish} (${entity?.polpalId}) in ${grouping?.nameEnglish} (${grouping?.polpalId})`,
      action: ChangeActionEnum.DELETED,
      field: '__deleted__',
      oldValue: JSON.stringify(existingGroupingMember),
      newValue: undefined,
      comment: comment?.trim() || undefined,
      batchId: batchId,
      userId: userId,
    });
  } catch (error) {
    logger.error({ err: error, groupingMemberId }, 'deleteGroupingMember failed');
    throw error;
  }
}