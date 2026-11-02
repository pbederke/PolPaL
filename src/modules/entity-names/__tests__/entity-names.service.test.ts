import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma, mockLogger } from '@/__test-utils__/mocks';

vi.mock('@/lib/server/prisma.server', () => ({ prisma: mockPrisma() }));
vi.mock('@/lib/server/logger.server', () => ({ default: mockLogger() }));
vi.mock('@/lib/server/changelogLogger', () => ({ logChangelog: vi.fn() }));

import { prisma } from '@/lib/server/prisma.server';
import logger from '@/lib/server/logger.server';
import { logChangelog } from '@/lib/server/changelogLogger';
import {
  getEntityNamesByPolpalId,
  createEntityName,
  updateEntityName,
  deleteEntityName,
} from '../entity-names.service';

describe('entity-names.service', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('getEntityNamesByPolpalId', () => {
    it('returns names for a polpalId', async () => {
      const mockData = [{ entityNameId: 1, polpalId: 100, nameShort: 'SPD', name: 'SPD', language: 'de' }];
      vi.mocked(prisma.entityNames.findMany).mockResolvedValue(mockData as never);
      const result = await getEntityNamesByPolpalId(100);
      expect(prisma.entityNames.findMany).toHaveBeenCalledWith({ where: { polpalId: 100 } });
      expect(result).toEqual(mockData);
    });
  });

  describe('createEntityName', () => {
    it('creates an entity name and logs changelog', async () => {
      const created = { entityNameId: 1, polpalId: 100, nameShort: 'SPD', name: 'SPD', language: 'de', userId: 1 };
      vi.mocked(prisma.entityNames.create).mockResolvedValue(created as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);

      const result = await createEntityName(1, {
        polpalId: 100, nameShort: 'SPD', name: 'SPD', language: 'de',
      });

      expect(result).toEqual(created);
      expect(logChangelog).toHaveBeenCalledOnce();
    });
  });

  describe('updateEntityName', () => {
    it('updates the name and logs changelog', async () => {
      const existing = { entityNameId: 1, polpalId: 100, nameShort: 'SPD', name: 'Sozialdemokratische Partei', language: 'de', startYear: 2000, startMonth: null, startDay: null, endYear: 2005, endMonth: null, endDay: null, comment: null, userId: 1 };
      const updated = { ...existing, nameShort: 'SPD', name: 'Social Democratic Party', language: 'en', startYear: 2001, endYear: 2006 };

      vi.mocked(prisma.entityNames.findUnique).mockResolvedValue(existing as never);
      vi.mocked(prisma.entityNames.update).mockResolvedValue(updated as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);

      const result = await updateEntityName(1, 1, {
        nameShort: 'SPD', name: 'Social Democratic Party', language: 'en',
        startYear: 2001, startMonth: null, startDay: null,
        endYear: 2006, endMonth: null, endDay: null,
      });

      expect(result).toEqual(updated);
      expect(prisma.entityNames.update).toHaveBeenCalledWith({
        where: { entityNameId: 1 },
        data: {
          nameShort: 'SPD', name: 'Social Democratic Party', language: 'en',
          startYear: 2001, startMonth: null, startDay: null,
          endYear: 2006, endMonth: null, endDay: null,
          userId: 1,
        },
      });
      expect(logChangelog).toHaveBeenCalledTimes(4);
    });

    it('only sends provided fields to the database', async () => {
      const existing = { entityNameId: 1, polpalId: 100, nameShort: 'SPD', name: 'SPD', language: 'de', startYear: 2000, startMonth: null, startDay: null, endYear: null, endMonth: null, endDay: null, comment: null, userId: 1 };

      vi.mocked(prisma.entityNames.findUnique).mockResolvedValue(existing as never);
      vi.mocked(prisma.entityNames.update).mockResolvedValue(existing as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);

      await updateEntityName(1, 1, { comment: 'updated comment' });

      expect(prisma.entityNames.update).toHaveBeenCalledWith({
        where: { entityNameId: 1 },
        data: { comment: 'updated comment', userId: 1 },
      });
      expect(logChangelog).toHaveBeenCalledTimes(1);
    });

    it('throws when entity name not found', async () => {
      vi.mocked(prisma.entityNames.findUnique).mockResolvedValue(null);
      await expect(updateEntityName(999, 1, { name: 'X' }))
        .rejects.toThrow('Entity name not found');
    });
  });

  describe('deleteEntityName', () => {
    it('deletes and logs changelog', async () => {
      const existing = { entityNameId: 1, polpalId: 100, nameShort: 'SPD', name: 'SPD', language: 'de' };
      vi.mocked(prisma.entityNames.findUnique).mockResolvedValue(existing as never);
      vi.mocked(prisma.entityNames.delete).mockResolvedValue(existing as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);

      await deleteEntityName(1, 1, 'test comment');
      expect(prisma.entityNames.delete).toHaveBeenCalledWith({ where: { entityNameId: 1 } });
      expect(logChangelog).toHaveBeenCalledOnce();
    });

    it('throws when entity name not found', async () => {
      vi.mocked(prisma.entityNames.findUnique).mockResolvedValue(null);
      await expect(deleteEntityName(999, 1)).rejects.toThrow('Entity name not found');
    });
  });

  describe('catch-log-rethrow', () => {
    it('getEntityNamesByPolpalId rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entityNames.findMany).mockRejectedValue(dbError);

      await expect(getEntityNamesByPolpalId(100)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('createEntityName rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entityNames.create).mockRejectedValue(dbError);

      await expect(createEntityName(1, {
        polpalId: 100, nameShort: 'SPD', name: 'SPD', language: 'de',
      })).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('updateEntityName rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entityNames.findUnique).mockResolvedValue({
        entityNameId: 1, polpalId: 100, nameShort: 'SPD', name: 'SPD', language: 'de',
        startYear: 2000, startMonth: null, startDay: null, endYear: null, endMonth: null, endDay: null, comment: null, userId: 1,
      } as never);
      vi.mocked(prisma.entityNames.update).mockRejectedValue(dbError);

      await expect(updateEntityName(1, 1, { name: 'X' })).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('deleteEntityName rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entityNames.findUnique).mockResolvedValue({
        entityNameId: 1, polpalId: 100, nameShort: 'SPD', name: 'SPD', language: 'de',
      } as never);
      vi.mocked(prisma.entityNames.delete).mockRejectedValue(dbError);

      await expect(deleteEntityName(1, 1)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
