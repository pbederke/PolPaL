import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma, mockLogger } from '@/__test-utils__/mocks';

vi.mock('@/lib/server/prisma.server', () => ({ prisma: mockPrisma() }));
vi.mock('@/lib/server/logger.server', () => ({ default: mockLogger() }));
vi.mock('@/lib/server/changelogLogger', () => ({ logChangelog: vi.fn() }));
vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }));

import { prisma } from '@/lib/server/prisma.server';
import { logChangelog } from '@/lib/server/changelogLogger';
import logger from '@/lib/server/logger.server';
import {
  createVersion,
  updateVersion,
  deleteVersion,
  getVersionInfos,
  getVersionsByDatasetKey,
  getVersions,
  getVersionEntries,
  getVersionsWithLinkingProgress,
  getVersionsByCountry,
} from '../versions.service';

describe('versions.service', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('createVersion', () => {
    it('creates a version and logs changelog', async () => {
      vi.mocked(prisma.versions.findUnique).mockResolvedValue(null);
      const created = { versionId: 1, versionKey: 'v1', version: '1.0', userId: 1 };
      vi.mocked(prisma.versions.create).mockResolvedValue(created as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);

      const result = await createVersion({
        projectKey: 'p1', datasetKey: 'ds1', versionKey: 'v1', version: '1.0', versionUrl: 'http://x',
        versionCitation: [],
      }, 1);
      expect(result).toEqual(created);
      expect(logChangelog).toHaveBeenCalledOnce();
    });

    it('throws when version key already exists', async () => {
      vi.mocked(prisma.versions.findUnique).mockResolvedValue({ versionKey: 'v1' } as never);
      await expect(createVersion({
        projectKey: 'p1', datasetKey: 'ds1', versionKey: 'v1', version: '1.0', versionUrl: '',
        versionCitation: [],
      }, 1)).rejects.toThrow('Version key already exists');
    });
  });

  describe('updateVersion', () => {
    it('updates and logs changed fields', async () => {
      const existing = { versionId: 1, versionKey: 'v1', version: '1.0' };
      vi.mocked(prisma.versions.findUnique).mockResolvedValue(existing as never);
      vi.mocked(prisma.versions.update).mockResolvedValue({ ...existing, version: '2.0' } as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);

      await updateVersion('v1', { version: '2.0' }, 1);
      expect(logChangelog).toHaveBeenCalled();
    });

    it('returns existing when no changes', async () => {
      const existing = { versionId: 1, versionKey: 'v1', version: '1.0' };
      vi.mocked(prisma.versions.findUnique).mockResolvedValue(existing as never);
      const result = await updateVersion('v1', { version: '1.0' }, 1);
      expect(result).toEqual(existing);
      expect(prisma.versions.update).not.toHaveBeenCalled();
    });

    it('throws when not found', async () => {
      vi.mocked(prisma.versions.findUnique).mockResolvedValue(null);
      await expect(updateVersion('xx', { version: '1' }, 1)).rejects.toThrow('Version not found');
    });
  });

  describe('deleteVersion', () => {
    it('deletes when no entries exist', async () => {
      const existing = { versionId: 1, versionKey: 'v1' };
      vi.mocked(prisma.versions.findUnique).mockResolvedValue(existing as never);
      vi.mocked(prisma.entries.count).mockResolvedValue(0 as never);
      vi.mocked(prisma.versions.delete).mockResolvedValue(existing as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);

      const result = await deleteVersion('v1', 1);
      expect(result).toEqual(existing);
    });

    it('throws when entries still exist', async () => {
      vi.mocked(prisma.versions.findUnique).mockResolvedValue({ versionKey: 'v1' } as never);
      vi.mocked(prisma.entries.count).mockResolvedValue(100 as never);
      await expect(deleteVersion('v1', 1)).rejects.toThrow('Cannot delete version. 100 entries still exist.');
    });

    it('throws when not found', async () => {
      vi.mocked(prisma.versions.findUnique).mockResolvedValue(null);
      await expect(deleteVersion('xx', 1)).rejects.toThrow('Version not found');
    });
  });

  describe('getVersionInfos', () => {
    it('returns null when not found', async () => {
      vi.mocked(prisma.versions.findUnique).mockResolvedValue(null);
      expect(await getVersionInfos('xx')).toBeNull();
    });
  });

  describe('getVersionsByDatasetKey', () => {
    it('returns versions for a dataset', async () => {
      vi.mocked(prisma.versions.findMany).mockResolvedValue([{ versionKey: 'v1', version: '1.0', versionName: null }] as never);
      const result = await getVersionsByDatasetKey('ds1');
      expect(result).toHaveLength(1);
    });
  });

  describe('getVersions', () => {
    it('returns all versions with transformed data', async () => {
      vi.mocked(prisma.versions.findMany).mockResolvedValue([{
        isHidden: false, isHiddenReason: null, projectKey: 'p1', datasetKey: 'ds1',
        versionKey: 'v1', version: '1.0', versionName: null, versionUrl: '',
        Projects: { projectKey: 'p1', projectNameShort: 'P', projectName: 'Proj', isHidden: false },
        Datasets: { datasetKey: 'ds1', datasetNameShort: 'D', datasetName: 'Data', isHidden: false },
      }] as never);
      const result = await getVersions();
      expect(result).toHaveLength(1);
      expect(result[0].projectKey).toBe('p1');
    });
  });

  describe('getVersionsByCountry', () => {
    it('returns distinct versions for a country', async () => {
      const raw = [{
        versionKey: 'v1', version: '1.0', versionName: null, versionUrl: 'http://v',
        projectKey: 'p1', projectNameShort: 'P', projectName: 'Proj', projectUrl: '',
        datasetKey: 'ds1', datasetNameShort: 'D', datasetName: 'Data', datasetUrl: '',
      }];
      vi.mocked(prisma.$queryRaw).mockResolvedValue(raw as never);

      const result = await getVersionsByCountry('US');
      expect(result).toHaveLength(1);
      expect(result[0].versionKey).toBe('v1');
      expect(result[0].projectKey).toBe('p1');
      expect(result[0].datasetKey).toBe('ds1');
    });

    it('parses versionCitation from JSON', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([] as never);
      const result = await getVersionsByCountry('US');
      expect(result).toEqual([]);
    });
  });

  describe('catch-log-rethrow', () => {
    it('getVersions rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.versions.findMany).mockRejectedValue(dbError);

      await expect(getVersions()).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getVersionEntries rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.versions.findUnique).mockRejectedValue(dbError);

      await expect(getVersionEntries('v1')).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getVersionInfos rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.versions.findUnique).mockRejectedValue(dbError);

      await expect(getVersionInfos('v1')).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('createVersion rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.versions.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.versions.create).mockRejectedValue(dbError);

      await expect(createVersion({
        projectKey: 'p1', datasetKey: 'ds1', versionKey: 'v1', version: '1.0', versionUrl: '',
        versionCitation: [],
      }, 1)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('deleteVersion rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.versions.findUnique).mockResolvedValue({ versionId: 1, versionKey: 'v1' } as never);
      vi.mocked(prisma.entries.count).mockRejectedValue(dbError);

      await expect(deleteVersion('v1', 1)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getVersionsWithLinkingProgress maps grouped progress onto versions', async () => {
      vi.mocked(prisma.versions.findMany).mockResolvedValue([
        {
          isHidden: false,
          versionKey: 'allgovtministers',
          version: '1.0',
          versionName: 'All Government Ministers',
          Projects: { projectKey: 'govt', projectNameShort: 'Gov', projectName: 'Government' },
          Datasets: { datasetKey: 'ministers', datasetNameShort: 'Ministers', datasetName: 'Ministers List' },
          _count: { Entries: 100 },
        },
        {
          isHidden: true,
          versionKey: 'emptyversion',
          version: '2.0',
          versionName: 'Empty Version',
          Projects: { projectKey: 'govt', projectNameShort: 'Gov', projectName: 'Government' },
          Datasets: { datasetKey: 'ministers', datasetNameShort: 'Ministers', datasetName: 'Ministers List' },
          _count: { Entries: 50 },
        },
      ] as never);
      vi.mocked(prisma.$queryRaw).mockResolvedValue([
        { versionKey: 'allgovtministers', linkedCount: BigInt(40), validatedCount: BigInt(10) },
      ] as never);

      const result = await getVersionsWithLinkingProgress();

      expect(prisma.$queryRaw).toHaveBeenCalledOnce();
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        versionKey: 'allgovtministers',
        totalEntries: 100,
        linkingProgress: '40.00',
        validationProgress: '10.00',
      });
      expect(result[1]).toMatchObject({
        versionKey: 'emptyversion',
        totalEntries: 50,
        linkingProgress: '0.00',
        validationProgress: '0.00',
      });
    });

    it('getVersionsWithLinkingProgress rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.versions.findMany).mockRejectedValue(dbError);

      await expect(getVersionsWithLinkingProgress()).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getVersionsByCountry rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.$queryRaw).mockRejectedValue(dbError);

      await expect(getVersionsByCountry('US')).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getVersionsByDatasetKey rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.versions.findMany).mockRejectedValue(dbError);

      await expect(getVersionsByDatasetKey('ds1')).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
