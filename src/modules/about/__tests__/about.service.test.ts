import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma, mockLogger } from '@/__test-utils__/mocks';
import { TableNameAboutEnum } from "@prisma/client";

vi.mock('@/lib/server/prisma.server', () => ({ prisma: mockPrisma() }));
vi.mock('@/lib/server/logger.server', () => ({ default: mockLogger() }));

import { prisma } from '@/lib/server/prisma.server';
import { getAbout, createAbout, updateAbout, deleteAbout } from '../about.service';

describe('about.service', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('getAbout', () => {
    it('returns all about entries', async () => {
      const mockData = [
        { 
          id: 1,
          tableName: TableNameAboutEnum.contribution,
          name: 'Alice',
          affiliation: null,
          time: null,
          url: null,
          funding: null,
          comment: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      vi.mocked(prisma.about.findMany).mockResolvedValue(mockData as never);

      const result = await getAbout();

      expect(result).toEqual(mockData);
      expect(prisma.about.findMany).toHaveBeenCalledOnce();
    });

    it('throws on database error', async () => {
      vi.mocked(prisma.about.findMany).mockRejectedValue(new Error('DB error'));
      await expect(getAbout()).rejects.toThrow('DB error');
    });
  });

  describe('createAbout', () => {
    it('creates and returns an about entry', async () => {
      const input = {
        tableName: TableNameAboutEnum.contribution,
        name: 'Alice',
        affiliation: 'MIT',
        time: null,
        url: null,
        funding: null,
        comment: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const created = { id: 1, ...input };
      vi.mocked(prisma.about.create).mockResolvedValue(created as never);

      const result = await createAbout(input);

      expect(result).toEqual(created);
      expect(prisma.about.create).toHaveBeenCalledWith({ data: input });
    });

    it('throws on database error', async () => {
      vi.mocked(prisma.about.create).mockRejectedValue(new Error('Unique constraint'));
      await expect(createAbout({
        tableName: TableNameAboutEnum.contribution, name: null, affiliation: null,
        time: null, url: null, funding: null, comment: null,
      })).rejects.toThrow('Unique constraint');
    });
  });

  describe('updateAbout', () => {
    it('updates and returns the about entry', async () => {
      const data = { name: 'Bob', affiliation: 'Stanford', time: null, url: null, funding: null, comment: null };
      const updated = { 
        id: 1,
        tableName: TableNameAboutEnum.contribution,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data
      };
      vi.mocked(prisma.about.update).mockResolvedValue(updated as never);

      const result = await updateAbout(1, data);

      expect(result).toEqual(updated);
      expect(prisma.about.update).toHaveBeenCalledWith({ where: { id: 1 }, data });
    });

    it('throws when entry not found', async () => {
      vi.mocked(prisma.about.update).mockRejectedValue(new Error('Record not found'));
      await expect(updateAbout(999, {
        name: null, affiliation: null, time: null, url: null, funding: null, comment: null,
      })).rejects.toThrow('Record not found');
    });
  });

  describe('deleteAbout', () => {
    it('deletes an about entry', async () => {
      vi.mocked(prisma.about.delete).mockResolvedValue({} as never);

      await deleteAbout(1);

      expect(prisma.about.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('throws when entry not found', async () => {
      vi.mocked(prisma.about.delete).mockRejectedValue(new Error('Record not found'));
      await expect(deleteAbout(999)).rejects.toThrow('Record not found');
    });
  });
});
