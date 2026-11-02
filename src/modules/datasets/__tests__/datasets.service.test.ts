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
  createDataset,
  updateDataset,
  deleteDataset,
  getDatasetVersions,
  getDatasetInfos,
  getAllDatasetsHomepage,
} from '../datasets.service';

describe('datasets.service', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('createDataset', () => {
    it('creates a dataset and logs changelog', async () => {
      vi.mocked(prisma.datasets.findUnique).mockResolvedValue(null);
      const created = { datasetId: 1, datasetKey: 'ds1', datasetName: 'Test Dataset', userId: 1 };
      vi.mocked(prisma.datasets.create).mockResolvedValue(created as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);

      const result = await createDataset({
        projectKey: 'p1', datasetKey: 'ds1', datasetNameShort: 'TD', datasetName: 'Test Dataset',
      }, 1);
      expect(result).toEqual(created);
      expect(logChangelog).toHaveBeenCalledOnce();
    });

    it('throws when dataset key already exists', async () => {
      vi.mocked(prisma.datasets.findUnique).mockResolvedValue({ datasetKey: 'ds1' } as never);
      await expect(createDataset({
        projectKey: 'p1', datasetKey: 'ds1', datasetNameShort: 'TD', datasetName: 'Test',
      }, 1)).rejects.toThrow('Dataset key already exists');
    });
  });

  describe('updateDataset', () => {
    it('updates and logs changed fields', async () => {
      const existing = { datasetId: 1, datasetKey: 'ds1', datasetName: 'Old', datasetNameShort: 'old', projectKey: 'p1' };
      vi.mocked(prisma.datasets.findUnique).mockResolvedValue(existing as never);
      vi.mocked(prisma.datasets.update).mockResolvedValue({ ...existing, datasetName: 'New' } as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);

      const result = await updateDataset('ds1', { datasetName: 'New' }, 1);
      expect(result).toBeDefined();
      expect(logChangelog).toHaveBeenCalled();
    });

    it('returns existing when no changes', async () => {
      const existing = { datasetId: 1, datasetKey: 'ds1', datasetName: 'Same' };
      vi.mocked(prisma.datasets.findUnique).mockResolvedValue(existing as never);
      const result = await updateDataset('ds1', { datasetName: 'Same' }, 1);
      expect(result).toEqual(existing);
      expect(prisma.datasets.update).not.toHaveBeenCalled();
    });

    it('throws when dataset not found', async () => {
      vi.mocked(prisma.datasets.findUnique).mockResolvedValue(null);
      await expect(updateDataset('xx', { datasetName: 'X' }, 1)).rejects.toThrow('Dataset not found');
    });
  });

  describe('deleteDataset', () => {
    it('deletes when no versions exist', async () => {
      const existing = { datasetId: 1, datasetKey: 'ds1', datasetName: 'Test' };
      vi.mocked(prisma.datasets.findUnique).mockResolvedValue(existing as never);
      vi.mocked(prisma.versions.count).mockResolvedValue(0 as never);
      vi.mocked(prisma.datasets.delete).mockResolvedValue(existing as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);

      const result = await deleteDataset('ds1', 1);
      expect(result).toEqual(existing);
    });

    it('throws when versions still exist', async () => {
      vi.mocked(prisma.datasets.findUnique).mockResolvedValue({ datasetKey: 'ds1' } as never);
      vi.mocked(prisma.versions.count).mockResolvedValue(5 as never);
      await expect(deleteDataset('ds1', 1)).rejects.toThrow('Cannot delete dataset. 5 versions still exist.');
    });

    it('throws when dataset not found', async () => {
      vi.mocked(prisma.datasets.findUnique).mockResolvedValue(null);
      await expect(deleteDataset('xx', 1)).rejects.toThrow('Dataset not found');
    });
  });

  describe('getDatasetVersions', () => {
    it('returns null when dataset not found', async () => {
      vi.mocked(prisma.datasets.findUnique).mockResolvedValue(null);
      const result = await getDatasetVersions('ds1');
      expect(result).toBeNull();
    });

    it('transforms dataset with versions', async () => {
      vi.mocked(prisma.datasets.findUnique).mockResolvedValue({
        isHidden: false, isHiddenReason: null, datasetKey: 'ds1', datasetNameShort: 'DS', datasetName: 'Test',
        datasetUrl: null, datasetDescription: null, comment: null,
        Projects: { isHidden: false, isHiddenReason: null, projectKey: 'p1', projectNameShort: 'P', projectName: 'Proj' },
        Versions: [{
          isHidden: false, isHiddenReason: null, versionKey: 'v1', version: '1.0', versionName: 'V1',
          versionUrl: null, versionCitation: null,
          _count: { Entries: 10 },
          Entries: [{ countrycodePolpal: 'DE', Countries: { iso2c: 'DE', countryname: 'Germany' } }],
        }],
      } as never);

      const result = await getDatasetVersions('ds1');
      expect(result).not.toBeNull();
      expect(result!.projectKey).toBe('p1');
      expect(result!.Versions).toHaveLength(1);
      expect(result!.Versions[0].entryCount).toBe(10);
    });
  });

  describe('getDatasetInfos', () => {
    it('returns null when not found', async () => {
      vi.mocked(prisma.datasets.findUnique).mockResolvedValue(null);
      expect(await getDatasetInfos('xx')).toBeNull();
    });
  });

  describe('getAllDatasetsHomepage', () => {
    it('returns transformed datasets', async () => {
      vi.mocked(prisma.datasets.findMany).mockResolvedValue([{
        isHidden: false, datasetKey: 'ds1', datasetNameShort: 'DS', datasetName: 'Test',
        Projects: { isHidden: false, projectKey: 'p1', projectNameShort: 'P', projectName: 'Proj' },
      }] as never);
      const result = await getAllDatasetsHomepage();
      expect(result).toHaveLength(1);
      expect(result[0].projectKey).toBe('p1');
    });
  });

  describe('catch-log-rethrow', () => {
    it('getDatasetVersions rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.datasets.findUnique).mockRejectedValue(dbError);

      await expect(getDatasetVersions('ds1')).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getDatasetInfos rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.datasets.findUnique).mockRejectedValue(dbError);

      await expect(getDatasetInfos('ds1')).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
