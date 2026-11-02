import { prisma } from './prisma.server';
import { ChangeActionEnum, TableNamesEnum } from '@/lib/shared/enums';

interface LogChangelogParams {
  tableName: TableNamesEnum;
  recordId: number | string;
  recordName: string;
  action: ChangeActionEnum;
  field?: string;
  oldValue?: string;
  newValue?: string;
  comment?: string;
  batchId?: string;
  bulk?: boolean;
  userId?: number;
}

export async function logChangelog({
  tableName,
  recordId,
  recordName,
  action,
  field,
  oldValue,
  newValue,
  comment,
  batchId,
  bulk,
  userId,
}: LogChangelogParams) {
  return prisma.changelog.create({
    data: {
      tableName,
      recordId: typeof recordId === 'string' ? parseInt(recordId) : recordId,
      recordName,
      action,
      field,
      oldValue,
      newValue,
      comment,
      batchId,
      bulk,
      userId,
    },
  });
}

export async function logChangelogMany(entries: LogChangelogParams[]) {
  if (entries.length === 0) return;
  return prisma.changelog.createMany({
    data: entries.map((e) => ({
      tableName: e.tableName,
      recordId: typeof e.recordId === 'string' ? parseInt(e.recordId, 10) : e.recordId,
      recordName: e.recordName,
      action: e.action,
      field: e.field,
      oldValue: e.oldValue,
      newValue: e.newValue,
      comment: e.comment,
      batchId: e.batchId,
      bulk: e.bulk,
      userId: e.userId,
    })),
  });
}
