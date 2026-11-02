import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma, mockLogger } from '@/__test-utils__/mocks';

vi.mock('@/lib/server/prisma.server', () => ({ prisma: mockPrisma() }));
vi.mock('@/lib/server/logger.server', () => ({ default: mockLogger() }));
vi.mock('@/lib/server/changelogLogger', () => ({ logChangelog: vi.fn() }));
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn, revalidateTag: vi.fn() }));

import { prisma } from '@/lib/server/prisma.server';
import { logChangelog } from '@/lib/server/changelogLogger';
import logger from '@/lib/server/logger.server';
import {
  createProject,
  updateProject,
  deleteProject,
  getProjectDatasets,
  getProjectInfos,
  getAllProjectDatasets,
} from '../projects.service';

describe('projects.service', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('createProject', () => {
    it('creates a project and logs changelog', async () => {
      vi.mocked(prisma.projects.findUnique).mockResolvedValue(null);
      const created = { projectId: 1, projectKey: 'p1', projectName: 'Test', userId: 1 };
      vi.mocked(prisma.projects.create).mockResolvedValue(created as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);

      const result = await createProject({
        projectKey: 'p1', projectNameShort: 'T', projectName: 'Test',
      }, 1);
      expect(result).toEqual(created);
      expect(logChangelog).toHaveBeenCalledOnce();
    });

    it('throws when project key already exists', async () => {
      vi.mocked(prisma.projects.findUnique).mockResolvedValue({ projectKey: 'p1' } as never);
      await expect(createProject({
        projectKey: 'p1', projectNameShort: 'T', projectName: 'Test',
      }, 1)).rejects.toThrow('Project key already exists');
    });
  });

  describe('updateProject', () => {
    it('updates and logs changed fields', async () => {
      const existing = { projectId: 1, projectKey: 'p1', projectName: 'Old' };
      vi.mocked(prisma.projects.findUnique).mockResolvedValue(existing as never);
      vi.mocked(prisma.projects.update).mockResolvedValue({ ...existing, projectName: 'New' } as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);

      await updateProject('p1', { projectName: 'New' }, 1);
      expect(logChangelog).toHaveBeenCalled();
    });

    it('returns existing when no changes', async () => {
      const existing = { projectId: 1, projectKey: 'p1', projectName: 'Same' };
      vi.mocked(prisma.projects.findUnique).mockResolvedValue(existing as never);
      const result = await updateProject('p1', { projectName: 'Same' }, 1);
      expect(result).toEqual(existing);
      expect(prisma.projects.update).not.toHaveBeenCalled();
    });

    it('throws when not found', async () => {
      vi.mocked(prisma.projects.findUnique).mockResolvedValue(null);
      await expect(updateProject('xx', { projectName: 'X' }, 1)).rejects.toThrow('Project not found');
    });
  });

  describe('deleteProject', () => {
    it('deletes when no datasets exist', async () => {
      const existing = { projectId: 1, projectKey: 'p1' };
      vi.mocked(prisma.projects.findUnique).mockResolvedValue(existing as never);
      vi.mocked(prisma.datasets.count).mockResolvedValue(0 as never);
      vi.mocked(prisma.projects.delete).mockResolvedValue(existing as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);

      const result = await deleteProject('p1', 1);
      expect(result).toEqual(existing);
    });

    it('throws when datasets still exist', async () => {
      vi.mocked(prisma.projects.findUnique).mockResolvedValue({ projectKey: 'p1' } as never);
      vi.mocked(prisma.datasets.count).mockResolvedValue(3 as never);
      await expect(deleteProject('p1', 1)).rejects.toThrow('Cannot delete project. 3 datasets still exist.');
    });

    it('throws when not found', async () => {
      vi.mocked(prisma.projects.findUnique).mockResolvedValue(null);
      await expect(deleteProject('xx', 1)).rejects.toThrow('Project not found');
    });
  });

  describe('getProjectDatasets', () => {
    it('returns null when not found', async () => {
      vi.mocked(prisma.projects.findUnique).mockResolvedValue(null);
      expect(await getProjectDatasets('xx')).toBeNull();
    });
  });

  describe('getProjectInfos', () => {
    it('returns null when not found', async () => {
      vi.mocked(prisma.projects.findUnique).mockResolvedValue(null);
      expect(await getProjectInfos('xx')).toBeNull();
    });

    it('returns transformed project info', async () => {
      vi.mocked(prisma.projects.findUnique).mockResolvedValue({
        isHidden: false, isHiddenReason: null, projectKey: 'p1', projectNameShort: 'P', projectName: 'Proj',
        projectUrl: null, projectDescription: null, comment: null,
      } as never);
      const result = await getProjectInfos('p1');
      expect(result).not.toBeNull();
      expect(result!.projectKey).toBe('p1');
    });
  });

  describe('getAllProjectDatasets', () => {
    it('returns all projects with datasets', async () => {
      vi.mocked(prisma.projects.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.entries.groupBy).mockResolvedValue([] as never);
      vi.mocked(prisma.countries.findMany).mockResolvedValue([] as never);
      const result = await getAllProjectDatasets();
      expect(result).toEqual([]);
    });

    it('merges distinct countries per version in SQL-derived order', async () => {
      vi.mocked(prisma.projects.findMany).mockResolvedValue([
        {
          isHidden: false, isHiddenReason: null, projectKey: 'p1', projectNameShort: 'P',
          projectName: 'Proj', projectUrl: null, projectDescription: null, comment: null,
          Datasets: [
            {
              isHidden: false, isHiddenReason: null, datasetKey: 'd1', datasetName: 'DS',
              datasetNameShort: 'DS', datasetUrl: null, comment: null,
              Versions: [
                { isHidden: false, isHiddenReason: null, versionKey: 'v1', version: '1.0', versionName: null, versionUrl: 'http://x', versionCitation: null },
              ],
            },
          ],
        },
      ] as never);
      vi.mocked(prisma.entries.groupBy).mockResolvedValue([
        { versionKey: 'v1', countrycodePolpal: 'FRA' },
        { versionKey: 'v1', countrycodePolpal: 'DEU' },
      ] as never);
      vi.mocked(prisma.countries.findMany).mockResolvedValue([
        { countrycodePolpal: 'DEU', iso2c: 'DE', countryname: 'Germany' },
        { countrycodePolpal: 'FRA', iso2c: 'FR', countryname: 'France' },
      ] as never);

      const result = await getAllProjectDatasets();
      expect(result[0].Datasets[0].Versions[0].countries).toEqual([
        { countrycodePolpal: 'FRA', iso2c: 'FR', countryname: 'France' },
        { countrycodePolpal: 'DEU', iso2c: 'DE', countryname: 'Germany' },
      ]);
      expect(prisma.entries.groupBy).toHaveBeenCalledWith({
        by: ['versionKey', 'countrycodePolpal'],
        orderBy: { countrycodePolpal: 'asc' },
      });
    });
  });

  describe('catch-log-rethrow', () => {
    it('getAllProjectDatasets rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.projects.findMany).mockRejectedValue(dbError);

      await expect(getAllProjectDatasets()).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getProjectInfos rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.projects.findUnique).mockRejectedValue(dbError);

      await expect(getProjectInfos('p1')).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
