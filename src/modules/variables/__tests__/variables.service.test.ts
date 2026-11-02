import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma, mockLogger } from '@/__test-utils__/mocks';

vi.mock('@/lib/server/prisma.server', () => ({ prisma: mockPrisma() }));
vi.mock('@/lib/server/logger.server', () => ({ default: mockLogger() }));
vi.mock('@/lib/server/changelogLogger', () => ({ logChangelog: vi.fn() }));

import { prisma } from '@/lib/server/prisma.server';
import logger from '@/lib/server/logger.server';
import { logChangelog } from '@/lib/server/changelogLogger';
import {
  getVariablesForVersion,
  getAvailableVars,
  createVariable,
  deleteVariable,
} from '../variables.service';

describe('variables.service', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('getVariablesForVersion', () => {
    it('returns variables for a version', async () => {
      const mockData = [{ variableId: 1, entryEntityIdVar: 'gdp', varTitle: 'GDP', varContent: 'Content', createdAt: new Date(), updatedAt: new Date(), userId: 1 }];
      vi.mocked(prisma.variables.findMany).mockResolvedValue(mockData as never);
      const result = await getVariablesForVersion('v1');
      expect(result).toEqual(mockData);
    });
  });

  describe('getAvailableVars', () => {
    it('returns vars in entries but not yet documented', async () => {
      vi.mocked(prisma.entries.findMany).mockResolvedValue([
        { entryEntityIdVar: 'gdp' },
        { entryEntityIdVar: 'pop' },
        { entryEntityIdVar: 'area' },
      ] as never);
      vi.mocked(prisma.variables.findMany).mockResolvedValue([
        { entryEntityIdVar: 'gdp' },
      ] as never);

      const result = await getAvailableVars('v1');
      expect(result).toEqual(['pop', 'area']);
    });

    it('returns all vars when none documented', async () => {
      vi.mocked(prisma.entries.findMany).mockResolvedValue([{ entryEntityIdVar: 'x' }, { entryEntityIdVar: 'y' }] as never);
      vi.mocked(prisma.variables.findMany).mockResolvedValue([] as never);

      const result = await getAvailableVars('v1');
      expect(result).toEqual(['x', 'y']);
    });
  });

  describe('createVariable', () => {
    it('creates a variable after checking uniqueness', async () => {
      vi.mocked(prisma.variables.findUnique).mockResolvedValue(null);
      const created = { variableId: 1, versionKey: 'v1', entryEntityIdVar: 'gdp', varTitle: 'GDP', varContent: 'Content', userId: 1 };
      vi.mocked(prisma.variables.create).mockResolvedValue(created as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);

      const result = await createVariable('v1', { entryEntityIdVar: 'gdp', varTitle: 'GDP', varContent: 'Content' }, 1);
      expect(result).toEqual(created);
      expect(logChangelog).toHaveBeenCalledOnce();
    });

    it('throws when variable already exists', async () => {
      vi.mocked(prisma.variables.findUnique).mockResolvedValue({ variableId: 1 } as never);
      await expect(createVariable('v1', { entryEntityIdVar: 'gdp', varTitle: 'GDP', varContent: '' }, 1))
        .rejects.toThrow('Variable documentation already exists');
    });
  });

  describe('deleteVariable', () => {
    it('deletes and logs changelog', async () => {
      vi.mocked(prisma.variables.findUnique).mockResolvedValue({ variableId: 1, versionKey: 'v1', entryEntityIdVar: 'gdp' } as never);
      vi.mocked(prisma.variables.delete).mockResolvedValue({} as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);

      await deleteVariable(1, 1);
      expect(prisma.variables.delete).toHaveBeenCalled();
      expect(logChangelog).toHaveBeenCalledOnce();
    });

    it('throws when variable not found', async () => {
      vi.mocked(prisma.variables.findUnique).mockResolvedValue(null);
      await expect(deleteVariable(999, 1)).rejects.toThrow('Variable not found');
    });
  });

  describe('catch-log-rethrow', () => {
    it('getVariablesForVersion rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.variables.findMany).mockRejectedValue(dbError);

      await expect(getVariablesForVersion('v1')).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getAvailableVars rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entries.findMany).mockRejectedValue(dbError);

      await expect(getAvailableVars('v1')).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('createVariable rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.variables.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.variables.create).mockRejectedValue(dbError);

      await expect(createVariable('v1', { entryEntityIdVar: 'gdp', varTitle: 'GDP', varContent: 'Content' }, 1))
        .rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('deleteVariable rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.variables.findUnique).mockResolvedValue({ variableId: 1, versionKey: 'v1', entryEntityIdVar: 'gdp' } as never);
      vi.mocked(prisma.variables.delete).mockRejectedValue(dbError);

      await expect(deleteVariable(1, 1)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
