import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma, mockLogger } from '@/__test-utils__/mocks';

vi.mock('@/lib/server/prisma.server', () => ({ prisma: mockPrisma() }));
vi.mock('@/lib/server/logger.server', () => ({ default: mockLogger() }));
vi.mock('@/lib/server/changelogLogger', () => ({ logChangelog: vi.fn(), logChangelogMany: vi.fn() }));

import { prisma } from '@/lib/server/prisma.server';
import logger from '@/lib/server/logger.server';
import { logChangelog, logChangelogMany } from '@/lib/server/changelogLogger';
import {
  createLink,
  deleteLinkByEntry,
  deleteLinkByEntryBulk,
  deleteLinkByEntriesAndPolpalId,
  createLinksBulk,
  getLinksByPolPalId,
  createAutoLinksBulk,
} from '../links.service';

describe('links.service', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('createLink', () => {
    it('returns existing link if already exists (idempotent)', async () => {
      const existing = { linkEntriesToEntityId: 1, polpalId: 100, uniqueObservationId: 'obs1' };
      vi.mocked(prisma.linksEntryToEntity.findUnique).mockResolvedValue(existing as never);

      const result = await createLink({ polpalId: 100, uniqueObservationId: 'obs1' }, 1);
      expect(result).toEqual(existing);
      expect(prisma.linksEntryToEntity.create).not.toHaveBeenCalled();
    });

    it('creates a new link and logs changelog', async () => {
      vi.mocked(prisma.linksEntryToEntity.findUnique).mockResolvedValue(null);
      const created = { linkEntriesToEntityId: 1, polpalId: 100, uniqueObservationId: 'obs1' };
      vi.mocked(prisma.linksEntryToEntity.create).mockResolvedValue(created as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);

      const result = await createLink({ polpalId: 100, uniqueObservationId: 'obs1' }, 1);
      expect(result).toEqual(created);
      expect(logChangelog).toHaveBeenCalledOnce();
    });
  });

  describe('deleteLinkByEntry', () => {
    it('deletes all links for an entry and logs one bulk changelog', async () => {
      const links = [
        { linkEntriesToEntityId: 1, uniqueObservationId: 'obs1', polpalId: 100 },
        { linkEntriesToEntityId: 2, uniqueObservationId: 'obs1', polpalId: 200 },
      ];
      vi.mocked(prisma.linksEntryToEntity.findMany).mockResolvedValue(links as never);
      vi.mocked(logChangelogMany).mockResolvedValue({ count: 2 } as never);
      vi.mocked(prisma.linksEntryToEntity.deleteMany).mockResolvedValue({ count: 2 } as never);

      await deleteLinkByEntry('obs1', 1);
      expect(prisma.linksEntryToEntity.deleteMany).toHaveBeenCalled();
      expect(logChangelogMany).toHaveBeenCalledTimes(1);
      expect(logChangelogMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ recordId: 1, action: 'DELETED' }),
          expect.objectContaining({ recordId: 2, action: 'DELETED' }),
        ])
      );
    });
  });

  describe('deleteLinkByEntryBulk', () => {
    it('deletes multiple entry links and logs one bulk changelog', async () => {
      vi.mocked(prisma.linksEntryToEntity.findMany).mockResolvedValue([
        { linkEntriesToEntityId: 1, uniqueObservationId: 'obs1', polpalId: 100 },
        { linkEntriesToEntityId: 2, uniqueObservationId: 'obs2', polpalId: 200 },
      ] as never);
      vi.mocked(logChangelogMany).mockResolvedValue({ count: 2 } as never);
      vi.mocked(prisma.linksEntryToEntity.deleteMany).mockResolvedValue({ count: 2 } as never);

      await deleteLinkByEntryBulk(['obs1', 'obs2'], 1);
      expect(prisma.linksEntryToEntity.deleteMany).toHaveBeenCalled();
      expect(logChangelogMany).toHaveBeenCalledTimes(1);
      expect(logChangelogMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ recordId: 1, bulk: true }),
          expect.objectContaining({ recordId: 2, bulk: true }),
        ])
      );
    });
  });

  describe('deleteLinkByEntriesAndPolpalId', () => {
    it('deletes specific links by entries and polpalId and logs one bulk changelog', async () => {
      vi.mocked(prisma.linksEntryToEntity.findMany).mockResolvedValue([
        { linkEntriesToEntityId: 1, uniqueObservationId: 'obs1', polpalId: 100 },
      ] as never);
      vi.mocked(logChangelogMany).mockResolvedValue({ count: 1 } as never);
      vi.mocked(prisma.linksEntryToEntity.deleteMany).mockResolvedValue({ count: 1 } as never);

      await deleteLinkByEntriesAndPolpalId(['obs1'], 100, 1);
      expect(prisma.linksEntryToEntity.deleteMany).toHaveBeenCalled();
      expect(logChangelogMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('getLinksByPolPalId', () => {
    it('returns links for a polpalId', async () => {
      const mockData = [{ linkEntriesToEntityId: 1, polpalId: 100 }];
      vi.mocked(prisma.linksEntryToEntity.findMany).mockResolvedValue(mockData as never);
      const result = await getLinksByPolPalId(100);
      expect(result).toEqual(mockData);
    });
  });

  describe('createLinksBulk', () => {
    it('bulk creates links in a transaction', async () => {
      vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
        const tx = {
          linksEntryToEntity: {
            createManyAndReturn: vi.fn().mockResolvedValue([
              { linkEntriesToEntityId: 1, polpalId: 100, uniqueObservationId: 'obs1' },
              { linkEntriesToEntityId: 2, polpalId: 100, uniqueObservationId: 'obs2' },
            ] as never),
          },
          changelog: { createMany: vi.fn() },
        };
        return (fn as (t: typeof tx) => Promise<unknown>)(tx);
      });

      const result = await createLinksBulk([
        { uniqueObservationIds: ['obs1', 'obs2'], polpalId: 100 },
      ], 1);
      expect(result.created).toBe(2);
    });
  });

  describe('createAutoLinksBulk', () => {
    it('returns early with count 0 for empty input', async () => {
      const result = await createAutoLinksBulk([], 1);
      expect(result.created).toBe(0);
    });

    it('bulk creates auto links in a transaction', async () => {
      vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
        const tx = {
          linksEntryToEntity: {
            createManyAndReturn: vi.fn().mockResolvedValue([
              { linkEntriesToEntityId: 1, polpalId: 100, uniqueObservationId: 'obs1' },
            ] as never),
          },
          changelog: { createMany: vi.fn() },
        };
        return (fn as (t: typeof tx) => Promise<unknown>)(tx);
      });

      const result = await createAutoLinksBulk([
        { uniqueObservationId: 'obs1', polpalId: 100, startYear: 2000 },
      ], 1);
      expect(result.created).toBe(1);
    });
  });

  describe('catch-log-rethrow', () => {
    it('createLink rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.linksEntryToEntity.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.linksEntryToEntity.create).mockRejectedValue(dbError);

      await expect(createLink({ polpalId: 100, uniqueObservationId: 'obs1' }, 1))
        .rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('deleteLinkByEntry rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.linksEntryToEntity.findMany).mockRejectedValue(dbError);

      await expect(deleteLinkByEntry('obs1', 1)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('deleteLinkByEntryBulk rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.linksEntryToEntity.findMany).mockRejectedValue(dbError);

      await expect(deleteLinkByEntryBulk(['obs1', 'obs2'], 1)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('deleteLinkByEntriesAndPolpalId rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.linksEntryToEntity.findMany).mockRejectedValue(dbError);

      await expect(deleteLinkByEntriesAndPolpalId(['obs1'], 100, 1))
        .rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('createLinksBulk rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.$transaction).mockRejectedValue(dbError);

      await expect(createLinksBulk([{ uniqueObservationIds: ['obs1'], polpalId: 100 }], 1))
        .rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getLinksByPolPalId rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.linksEntryToEntity.findMany).mockRejectedValue(dbError);

      await expect(getLinksByPolPalId(100)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('createAutoLinksBulk rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.$transaction).mockRejectedValue(dbError);

      await expect(createAutoLinksBulk([{ uniqueObservationId: 'obs1', polpalId: 100 }], 1))
        .rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
