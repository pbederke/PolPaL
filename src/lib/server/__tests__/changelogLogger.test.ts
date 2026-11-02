import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma, mockLogger } from '@/__test-utils__/mocks';
import { ChangeActionEnum, TableNamesEnum } from '@/lib/shared/enums';

vi.mock('@/lib/server/prisma.server', () => ({ prisma: mockPrisma() }));
vi.mock('@/lib/server/logger.server', () => ({ default: mockLogger() }));

import { prisma } from '@/lib/server/prisma.server';
import { logChangelog, logChangelogMany } from '../changelogLogger';

describe('changelogLogger', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a changelog entry with all fields', async () => {
    vi.mocked(prisma.changelog.create).mockResolvedValue({} as never);

    await logChangelog({
      tableName: TableNamesEnum.entities,
      recordId: 42,
      recordName: 'SPD',
      action: ChangeActionEnum.UPDATED,
      field: 'nameShort',
      oldValue: 'Old',
      newValue: 'New',
      comment: 'test',
      batchId: 'batch-1',
      bulk: true,
      userId: 1,
    });

    expect(prisma.changelog.create).toHaveBeenCalledWith({
      data: {
        tableName: TableNamesEnum.entities,
        recordId: 42,
        recordName: 'SPD',
        action: ChangeActionEnum.UPDATED,
        field: 'nameShort',
        oldValue: 'Old',
        newValue: 'New',
        comment: 'test',
        batchId: 'batch-1',
        bulk: true,
        userId: 1,
      },
    });
  });

  it('converts string recordId to integer', async () => {
    vi.mocked(prisma.changelog.create).mockResolvedValue({} as never);

    await logChangelog({
      tableName: TableNamesEnum.entities,
      recordId: '123',
      recordName: 'Test',
      action: ChangeActionEnum.CREATED,
    });

    expect(prisma.changelog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ recordId: 123 }) }),
    );
  });

  it('handles numeric recordId without conversion', async () => {
    vi.mocked(prisma.changelog.create).mockResolvedValue({} as never);

    await logChangelog({
      tableName: TableNamesEnum.entries,
      recordId: 999,
      recordName: 'Entry',
      action: ChangeActionEnum.DELETED,
    });

    expect(prisma.changelog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ recordId: 999 }) }),
    );
  });

  it('omits optional fields when not provided', async () => {
    vi.mocked(prisma.changelog.create).mockResolvedValue({} as never);

    await logChangelog({
      tableName: TableNamesEnum.countries,
      recordId: 1,
      recordName: 'DE',
      action: ChangeActionEnum.CREATED,
    });

    expect(prisma.changelog.create).toHaveBeenCalledWith({
      data: {
        tableName: TableNamesEnum.countries,
        recordId: 1,
        recordName: 'DE',
        action: ChangeActionEnum.CREATED,
        field: undefined,
        oldValue: undefined,
        newValue: undefined,
        comment: undefined,
        batchId: undefined,
        bulk: undefined,
        userId: undefined,
      },
    });
  });

  describe('logChangelogMany', () => {
    it('creates all entries in a single createMany call', async () => {
      vi.mocked(prisma.changelog.createMany).mockResolvedValue({ count: 2 } as never);

      await logChangelogMany([
        {
          tableName: TableNamesEnum.linksEntriesToEntities,
          recordId: 11,
          recordName: 'obs1',
          action: ChangeActionEnum.DELETED,
          field: '__deleted__',
          oldValue: '{}',
          batchId: 'batch-1',
          bulk: true,
          userId: 1,
        },
        {
          tableName: TableNamesEnum.linksEntriesToEntities,
          recordId: 22,
          recordName: 'obs2',
          action: ChangeActionEnum.DELETED,
          field: '__deleted__',
          oldValue: '{}',
          batchId: 'batch-1',
          bulk: true,
          userId: 1,
        },
      ]);

      expect(prisma.changelog.createMany).toHaveBeenCalledTimes(1);
      expect(prisma.changelog.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({ recordId: 11, recordName: 'obs1', action: ChangeActionEnum.DELETED, bulk: true }),
          expect.objectContaining({ recordId: 22, recordName: 'obs2', action: ChangeActionEnum.DELETED, bulk: true }),
        ],
      });
    });

    it('converts string recordIds to integers', async () => {
      vi.mocked(prisma.changelog.createMany).mockResolvedValue({ count: 1 } as never);

      await logChangelogMany([
        {
          tableName: TableNamesEnum.entries,
          recordId: '123',
          recordName: 'Entry',
          action: ChangeActionEnum.CREATED,
        },
      ]);

      expect(prisma.changelog.createMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: [expect.objectContaining({ recordId: 123 })] }),
      );
    });

    it('returns early without calling createMany for empty input', async () => {
      await logChangelogMany([]);

      expect(prisma.changelog.createMany).not.toHaveBeenCalled();
    });
  });
});
