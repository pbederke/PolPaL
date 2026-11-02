import 'server-only';
import { prisma } from "@/lib/server/prisma.server";
import logger from "@/lib/server/logger.server";
import { logChangelog } from "@/lib/server/changelogLogger";
import { ChangeActionEnum, LanguageCodeEnum, ReferenceTypeEnum, TableNamesEnum } from "@/lib/shared/enums";

// ------------------------------------------------------------------------------
// Get by Entity
// ------------------------------------------------------------------------------

export async function getEntityReferences(polpalId: number) {
  try {
    return await prisma.references.findMany({
      where: { polpalId },
      select: {
        referenceId: true,
        referencedField: true,
        type: true,
        value: true,
        language: true,
        accessedAt: true,
        comment: true,
        createdAt: true,
      },
      orderBy: [{ referencedField: 'asc' }, { createdAt: 'asc' }],
    });
  } catch (error) {
    logger.error({ err: error, polpalId }, 'getEntityReferences failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// Update
// ------------------------------------------------------------------------------

export async function updateReference(
  referenceId: number,
  data: {
    type?: ReferenceTypeEnum;
    value?: string;
    referencedField?: string | null;
    language?: string | null;
    accessedAt?: string | null;
    comment?: string | null;
  },
  userId: number,
) {
  try {
    const existing = await prisma.references.findUnique({ where: { referenceId } });
    if (!existing) throw new Error('Reference not found');

    const updated = await prisma.references.update({
      where: { referenceId },
      data: {
        type: data.type ?? existing.type,
        value: data.value ?? existing.value,
        referencedField: data.referencedField !== undefined ? data.referencedField : existing.referencedField,
        language: data.language !== undefined ? (data.language as LanguageCodeEnum | null) : existing.language,
        accessedAt: data.accessedAt !== undefined ? (data.accessedAt ? new Date(data.accessedAt) : null) : existing.accessedAt,
        comment: data.comment !== undefined ? data.comment : existing.comment,
        userId,
      },
    });

    const batchId = crypto.randomUUID();

    const str = (v: unknown) => (v === null || v === undefined ? 'null' : String(v));
    const changedFields: { field: string; oldValue: string; newValue: string }[] = [];
    const compare = (field: string, oldVal: unknown, newVal: unknown) => {
      if (str(oldVal) !== str(newVal)) {
        changedFields.push({ field, oldValue: str(oldVal), newValue: str(newVal) });
      }
    };

    compare('type', existing.type, updated.type);
    compare('value', existing.value, updated.value);
    compare('referencedField', existing.referencedField, updated.referencedField);
    compare('language', existing.language, updated.language);
    compare('accessedAt', existing.accessedAt?.toISOString() ?? null, updated.accessedAt?.toISOString() ?? null);
    compare('comment', existing.comment, updated.comment);

    for (const change of changedFields) {
      await logChangelog({
        tableName: TableNamesEnum.references,
        recordId: existing.referenceId,
        recordName: existing.value,
        action: ChangeActionEnum.UPDATED,
        field: change.field,
        oldValue: change.oldValue,
        newValue: change.newValue,
        batchId,
        userId,
      });
    }

    return updated;
  } catch (error) {
    logger.error({ err: error, referenceId }, 'updateReference failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// Delete
// ------------------------------------------------------------------------------

export async function deleteReference(referenceId: number, userId: number, comment?: string) {
  try {
    const existing = await prisma.references.findUnique({ where: { referenceId } });
    if (!existing) throw new Error('Reference not found');

    await prisma.references.delete({ where: { referenceId } });

    const batchId = crypto.randomUUID();

    await logChangelog({
      tableName: TableNamesEnum.references,
      recordId: existing.referenceId,
      recordName: existing.value,
      action: ChangeActionEnum.DELETED,
      field: '__deleted__',
      oldValue: JSON.stringify(existing),
      newValue: undefined,
      comment: comment?.trim() || undefined,
      batchId,
      userId,
    });
  } catch (error) {
    logger.error({ err: error, referenceId }, 'deleteReference failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// Create
// ------------------------------------------------------------------------------
export async function createReference(
  data: {
    polpalId?: number | null;
    entityChangeId?: number | null;
    entityNameId?: number | null;
    groupingMemberId?: number | null;
    entitiesInCountriesId?: number | null;
    referencedField?: string | null;
    type: ReferenceTypeEnum;
    value: string;
    language?: string | null;
    accessedAt?: string | null;
    comment?: string | null;
  },
  userId: number,
) {
  try {
    const createdReference = await prisma.references.create({
      data: {
        polpalId: data.polpalId,
        entityChangeId: data.entityChangeId,
        entityNameId: data.entityNameId,
        groupingMemberId: data.groupingMemberId,
        entitiesInCountriesId: data.entitiesInCountriesId,
        referencedField: data.referencedField,
        type: data.type,
        value: data.value,
        language: data.language as LanguageCodeEnum | null | undefined,
        accessedAt: data.accessedAt ? new Date(data.accessedAt) : null,
        comment: data.comment,
        userId: userId,
      }
    })

    const batchId = crypto.randomUUID();

    // Create changelog entry for creation
    await logChangelog({
      tableName: TableNamesEnum.references,
      recordId: createdReference.referenceId,
      recordName: createdReference.value,
      action: ChangeActionEnum.CREATED,
      field: '__created__',
      oldValue: undefined,
      newValue: JSON.stringify(data),
      comment: undefined,
      batchId: batchId,
      userId: userId,
    });

    return createdReference;
  } catch (error) {
    logger.error({ err: error }, 'createReference failed');
    throw error;
  }
}
