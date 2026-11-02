import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma, mockLogger } from '@/__test-utils__/mocks';

vi.mock('@/lib/server/prisma.server', () => ({ prisma: mockPrisma() }));
vi.mock('@/lib/server/logger.server', () => ({ default: mockLogger() }));
vi.mock('@/lib/server/changelogLogger', () => ({ logChangelog: vi.fn() }));

import { prisma } from '@/lib/server/prisma.server';
import logger from '@/lib/server/logger.server';
import { logChangelog } from '@/lib/server/changelogLogger';
import {
  createEntityChange,
  updateEntityChange,
  deleteEntityChange,
} from '../entity-changes.service';

describe('entity-changes.service', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('createEntityChange', () => {
    it('creates a change after validating both entities exist', async () => {
      const entityOld = { polpalId: 10, nameEnglish: 'Old Party', entityType: 'PARTY' };
      const entityNew = { polpalId: 20, nameEnglish: 'New Party', entityType: 'PARTY' };
      const created = { entityChangeId: 1, polpalIdOld: 10, polpalIdNew: 20, changeYear: 2020, changeMonth: null, changeDay: null, changeType: 'MERGE', comment: null, userId: 1 };

      vi.mocked(prisma.entities.findUnique)
        .mockResolvedValueOnce(entityOld as never)
        .mockResolvedValueOnce(entityNew as never);
      vi.mocked(prisma.entityChanges.create).mockResolvedValue(created as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);

      const result = await createEntityChange(1, {
        polpalIdOld: 10, polpalIdNew: 20, changeYear: 2020,
        changeMonth: null, changeDay: null, changeType: 'MERGE' as never, comment: null,
      });

      expect(result).toEqual(created);
      expect(logChangelog).toHaveBeenCalledOnce();
      expect(prisma.entities.findUnique).toHaveBeenCalledWith({
        where: { polpalId: 10 },
        select: { polpalId: true, entityType: true, nameEnglish: true },
      });
      expect(prisma.entities.findUnique).toHaveBeenCalledWith({
        where: { polpalId: 20 },
        select: { polpalId: true, entityType: true, nameEnglish: true },
      });
    });

    it('throws when old entity not found', async () => {
      vi.mocked(prisma.entities.findUnique).mockResolvedValue(null);
      await expect(createEntityChange(1, {
        polpalIdOld: 999, polpalIdNew: 20, changeYear: 2020,
        changeMonth: null, changeDay: null, changeType: 'MERGE' as never, comment: null,
      })).rejects.toThrow('Invalid entity ID (old) or not of type PARTY');
    });

    it('throws when old entity is GROUPING type', async () => {
      vi.mocked(prisma.entities.findUnique).mockResolvedValue({ polpalId: 10, entityType: 'GROUPING', nameEnglish: 'G' } as never);
      await expect(createEntityChange(1, {
        polpalIdOld: 10, polpalIdNew: 20, changeYear: 2020,
        changeMonth: null, changeDay: null, changeType: 'MERGE' as never, comment: null,
      })).rejects.toThrow('Invalid entity ID (old) or not of type PARTY');
    });

    it('throws when new entity not found', async () => {
      vi.mocked(prisma.entities.findUnique)
        .mockResolvedValueOnce({ polpalId: 10, entityType: 'PARTY', nameEnglish: 'Old' } as never)
        .mockResolvedValueOnce(null);
      await expect(createEntityChange(1, {
        polpalIdOld: 10, polpalIdNew: 999, changeYear: 2020,
        changeMonth: null, changeDay: null, changeType: 'MERGE' as never, comment: null,
      })).rejects.toThrow('Invalid entity ID (new) or not of type PARTY');
    });
  });

  describe('updateEntityChange', () => {
    it('updates the data and logs changelog', async () => {
      const existing = { entityChangeId: 1, changeYear: 2000, changeMonth: null, changeDay: null, polpalIdOld: 10, polpalIdNew: 20, changeType: 'MERGE', comment: null, userId: 1 };
      const updated = { ...existing, changeYear: 2001, changeMonth: 5, changeDay: 3 };

      vi.mocked(prisma.entityChanges.findUnique).mockResolvedValue(existing as never);
      vi.mocked(prisma.entityChanges.update).mockResolvedValue(updated as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);

      const result = await updateEntityChange(1, 1, { changeYear: 2001, changeMonth: 5, changeDay: 3, comment: null });

      expect(result).toEqual(updated);
      expect(prisma.entityChanges.update).toHaveBeenCalledWith({
        where: { entityChangeId: 1 },
        data: { changeYear: 2001, changeMonth: 5, changeDay: 3, comment: null },
      });
      expect(logChangelog).toHaveBeenCalledTimes(3);
    });

    it('logs comment changes', async () => {
      const existing = { entityChangeId: 1, changeYear: 2000, changeMonth: null, changeDay: null, polpalIdOld: 10, polpalIdNew: 20, changeType: 'MERGE', comment: 'Old comment', userId: 1 };
      const updated = { ...existing, comment: 'New comment' };

      vi.mocked(prisma.entityChanges.findUnique).mockResolvedValue(existing as never);
      vi.mocked(prisma.entityChanges.update).mockResolvedValue(updated as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);

      await updateEntityChange(1, 1, { changeYear: 2000, changeMonth: null, changeDay: null, comment: 'New comment' });

      expect(logChangelog).toHaveBeenCalledOnce();
      expect(logChangelog).toHaveBeenCalledWith(expect.objectContaining({ field: 'comment', oldValue: 'Old comment', newValue: 'New comment' }));
    });

    it('does not log unchanged fields', async () => {
      const existing = { entityChangeId: 1, changeYear: 2000, changeMonth: 5, changeDay: 3, polpalIdOld: 10, polpalIdNew: 20, changeType: 'MERGE', comment: null, userId: 1 };
      const updated = { ...existing, changeYear: 2001 };

      vi.mocked(prisma.entityChanges.findUnique).mockResolvedValue(existing as never);
      vi.mocked(prisma.entityChanges.update).mockResolvedValue(updated as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);

      await updateEntityChange(1, 1, { changeYear: 2001, changeMonth: 5, changeDay: 3, comment: null });

      expect(logChangelog).toHaveBeenCalledOnce();
      expect(logChangelog).toHaveBeenCalledWith(expect.objectContaining({ field: 'changeYear', oldValue: '2000', newValue: '2001' }));
    });

    it('throws when entity change not found', async () => {
      vi.mocked(prisma.entityChanges.findUnique).mockResolvedValue(null);
      await expect(updateEntityChange(999, 1, { changeYear: 2001, changeMonth: null, changeDay: null, comment: null }))
        .rejects.toThrow('Entity change not found');
    });
  });

  describe('deleteEntityChange', () => {
    it('deletes and logs changelog', async () => {
      const existing = { entityChangeId: 1, polpalIdOld: 10, polpalIdNew: 20 };
      const entityOld = { polpalId: 10, nameEnglish: 'Old', entityType: 'PARTY' };
      const entityNew = { polpalId: 20, nameEnglish: 'New', entityType: 'PARTY' };

      vi.mocked(prisma.entityChanges.findUnique).mockResolvedValue(existing as never);
      vi.mocked(prisma.entities.findUnique)
        .mockResolvedValueOnce(entityOld as never)
        .mockResolvedValueOnce(entityNew as never);
      vi.mocked(prisma.entityChanges.delete).mockResolvedValue(existing as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);

      await deleteEntityChange(1, 1);
      expect(prisma.entityChanges.delete).toHaveBeenCalled();
      expect(logChangelog).toHaveBeenCalledOnce();
    });

    it('throws when entity change not found', async () => {
      vi.mocked(prisma.entityChanges.findUnique).mockResolvedValue(null);
      await expect(deleteEntityChange(999, 1)).rejects.toThrow('Entity change not found');
    });
  });

  describe('catch-log-rethrow', () => {
    it('createEntityChange rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entities.findUnique)
        .mockResolvedValueOnce({ polpalId: 10, nameEnglish: 'Old', entityType: 'PARTY' } as never)
        .mockResolvedValueOnce({ polpalId: 20, nameEnglish: 'New', entityType: 'PARTY' } as never);
      vi.mocked(prisma.entityChanges.create).mockRejectedValue(dbError);

      await expect(createEntityChange(1, {
        polpalIdOld: 10, polpalIdNew: 20, changeYear: 2020,
        changeMonth: null, changeDay: null, changeType: 'MERGE' as never, comment: null,
      })).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('updateEntityChange rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entityChanges.findUnique).mockResolvedValue({
        entityChangeId: 1, changeYear: 2000, changeMonth: null, changeDay: null,
        polpalIdOld: 10, polpalIdNew: 20, changeType: 'MERGE', comment: null, userId: 1,
      } as never);
      vi.mocked(prisma.entityChanges.update).mockRejectedValue(dbError);

      await expect(updateEntityChange(1, 1, { changeYear: 2001, changeMonth: null, changeDay: null, comment: null }))
        .rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('deleteEntityChange rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entityChanges.findUnique).mockResolvedValue({
        entityChangeId: 1, polpalIdOld: 10, polpalIdNew: 20,
      } as never);
      vi.mocked(prisma.entities.findUnique)
        .mockResolvedValueOnce({ polpalId: 10, nameEnglish: 'Old', entityType: 'PARTY' } as never)
        .mockResolvedValueOnce({ polpalId: 20, nameEnglish: 'New', entityType: 'PARTY' } as never);
      vi.mocked(prisma.entityChanges.delete).mockRejectedValue(dbError);

      await expect(deleteEntityChange(1, 1)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
