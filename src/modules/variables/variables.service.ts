import 'server-only';
import { prisma } from '@/lib/server/prisma.server';
import { logChangelog } from '@/lib/server/changelogLogger';
import logger from '@/lib/server/logger.server';
import { ChangeActionEnum, TableNamesEnum } from '@/lib/shared/enums';
import { z } from 'zod';
import { VariableCreateSchema } from './variables.schema';

export async function getVariablesForVersion(versionKey: string) {
  try {
    return await prisma.variables.findMany({
      where: { versionKey },
      orderBy: { entryEntityIdVar: 'asc' },
      select: {
        variableId: true,
        entryEntityIdVar: true,
        varTitle: true,
        varContent: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
      },
    });
  } catch (error) {
    logger.error({ err: error, versionKey }, 'getVariablesForVersion failed');
    throw error;
  }
}

export async function getAvailableVars(versionKey: string): Promise<string[]> {
  try {
    const [entriesVars, existingVars] = await Promise.all([
      prisma.entries.findMany({
        where: { versionKey },
        select: { entryEntityIdVar: true },
        distinct: ['entryEntityIdVar'],
        orderBy: { entryEntityIdVar: 'asc' },
      }),
      prisma.variables.findMany({
        where: { versionKey },
        select: { entryEntityIdVar: true },
      }),
    ]);

    const documented = new Set(existingVars.map((v) => v.entryEntityIdVar));
    return entriesVars
      .map((e) => e.entryEntityIdVar)
      .filter((v) => !documented.has(v));
  } catch (error) {
    logger.error({ err: error, versionKey }, 'getAvailableVars failed');
    throw error;
  }
}

export async function createVariable(
  versionKey: string,
  data: z.infer<typeof VariableCreateSchema>,
  userId: number,
) {
  try {
    const existing = await prisma.variables.findUnique({
      where: { versionKey_entryEntityIdVar: { versionKey, entryEntityIdVar: data.entryEntityIdVar } },
    });
    if (existing) throw new Error('Variable documentation already exists for this variable in the version');

    const created = await prisma.variables.create({
      data: { versionKey, ...data, userId },
    });

    await logChangelog({
      tableName: TableNamesEnum.variables,
      recordId: created.variableId,
      recordName: `${versionKey}/${data.entryEntityIdVar}`,
      action: ChangeActionEnum.CREATED,
      field: '__created__',
      newValue: JSON.stringify(data),
      userId,
    });

    return created;
  } catch (error) {
    logger.error({ err: error, versionKey }, 'createVariable failed');
    throw error;
  }
}

export async function deleteVariable(variableId: number, userId: number, comment?: string) {
  try {
    const variable = await prisma.variables.findUnique({
      where: { variableId },
      select: { variableId: true, versionKey: true, entryEntityIdVar: true },
    });
    if (!variable) throw new Error('Variable not found');

    await prisma.variables.delete({ where: { variableId } });

    await logChangelog({
      tableName: TableNamesEnum.variables,
      recordId: variableId,
      recordName: `${variable.versionKey}/${variable.entryEntityIdVar}`,
      action: ChangeActionEnum.DELETED,
      field: '__deleted__',
      newValue: undefined,
      comment: comment?.trim() || undefined,
      userId,
    });
  } catch (error) {
    logger.error({ err: error, variableId }, 'deleteVariable failed');
    throw error;
  }
}
