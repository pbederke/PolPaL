import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma, mockLogger } from '@/__test-utils__/mocks';

vi.mock('@/lib/server/prisma.server', () => ({ prisma: mockPrisma() }));
vi.mock('@/lib/server/logger.server', () => ({ default: mockLogger() }));
vi.mock('@/lib/server/changelogLogger', () => ({ logChangelog: vi.fn() }));

import { prisma } from '@/lib/server/prisma.server';
import { getNews, getNewsById, createNews, updateNews, deleteNews } from '../news.service';
import { logChangelog } from '@/lib/server/changelogLogger';
import logger from '@/lib/server/logger.server';

describe('news.service', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('getNews', () => {
    it('returns paginated news entries', async () => {
      const mockData = [{ 
        newsId: 1, 
        title: 'Hello', 
        content: 'World', 
        links: null, 
        publishedPublicAt: new Date(), 
        updatedPublicAt: null, 
        createdAt: new Date(), 
        updatedAt: new Date(), 
        userId: 1
      }];
      vi.mocked(prisma.news.findMany).mockResolvedValue(mockData as never);

      const result = await getNews(0, 30);

      expect(result).toEqual(mockData);
      expect(prisma.news.findMany).toHaveBeenCalledWith({
        select: { newsId: true, title: true, content: true, links: true, publishedPublicAt: true, updatedPublicAt: true },
        orderBy: { publishedPublicAt: 'desc' },
        skip: 0,
        take: 30,
      });
    });

    it('uses default pagination values', async () => {
      vi.mocked(prisma.news.findMany).mockResolvedValue([] as never);
      await getNews();
      expect(prisma.news.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 30 }),
      );
    });
  });

  describe('getNewsById', () => {
    it('returns a news entry by ID', async () => {
      const mockData = { 
        newsId: 1, 
        title: 'Hello', 
        content: 'World', 
        links: null, 
        publishedPublicAt: new Date(), 
        updatedPublicAt: null, 
        createdAt: new Date(), 
        updatedAt: new Date(), 
        userId: 1 
      };
      vi.mocked(prisma.news.findUnique).mockResolvedValue(mockData as never);

      const result = await getNewsById(1);
      expect(result).toEqual(mockData);
    });

    it('returns null when not found', async () => {
      vi.mocked(prisma.news.findUnique).mockResolvedValue(null);
      const result = await getNewsById(999);
      expect(result).toBeNull();
    });
  });

  describe('createNews', () => {
    it('creates a news entry and logs changelog', async () => {
      const created = { 
        newsId: 1, 
        title: 'New', 
        content: 'Content', 
        links: null, 
        publishedPublicAt: new Date(), 
        updatedPublicAt: null, 
        createdAt: new Date(), 
        updatedAt: new Date(), 
        userId: 1 
      };
      vi.mocked(prisma.news.create).mockResolvedValue(created as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);

      const result = await createNews(1, {
        title: 'New', content: 'Content', links: null, publishedPublicAt: new Date(),
      });

      expect(result).toEqual(created);
      expect(prisma.news.create).toHaveBeenCalledOnce();
      expect(logChangelog).toHaveBeenCalledOnce();
    });
  });

  describe('updateNews', () => {
    it('updates a news entry and logs changed fields', async () => {
      const existing = { 
        newsId: 1, 
        title: 'Old', 
        content: 'Content', 
        links: null, 
        publishedPublicAt: new Date(), 
        updatedPublicAt: null, 
        createdAt: new Date(), 
        updatedAt: new Date(), 
        userId: 1 
      };
      const updated = { ...existing, title: 'New' };
      vi.mocked(prisma.news.findUnique).mockResolvedValue(existing as never);
      vi.mocked(prisma.news.update).mockResolvedValue(updated as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);

      const result = await updateNews(1, { title: 'New' }, 1);

      expect(result).toEqual(updated);
      expect(logChangelog).toHaveBeenCalledOnce();
    });

    it('throws when news entry not found', async () => {
      vi.mocked(prisma.news.findUnique).mockResolvedValue(null);
      await expect(updateNews(999, { title: 'X' }, 1)).rejects.toThrow('News entry not found');
    });

    it('returns existing entry when no changes detected', async () => {
      const existing = { 
        newsId: 1, 
        title: 'Same', 
        content: 'Content', 
        links: null, 
        publishedPublicAt: new Date(), 
        updatedPublicAt: null, 
        createdAt: new Date(), 
        updatedAt: new Date(), 
        userId: 1 
      };
      vi.mocked(prisma.news.findUnique).mockResolvedValue(existing as never);

      const result = await updateNews(1, { title: 'Same' }, 1);

      expect(result).toEqual(existing);
      expect(prisma.news.update).not.toHaveBeenCalled();
      expect(logChangelog).not.toHaveBeenCalled();
    });
  });

  describe('deleteNews', () => {
    it('deletes a news entry and logs changelog', async () => {
      const existing = { 
        newsId: 1, 
        title: 'ToDelete', 
        content: 'Content', 
        links: null, 
        publishedPublicAt: new Date(), 
        updatedPublicAt: null, 
        createdAt: new Date(), 
        updatedAt: new Date(), 
        userId: 1 
      };
      vi.mocked(prisma.news.findUnique).mockResolvedValue(existing as never);
      vi.mocked(prisma.news.delete).mockResolvedValue(existing as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);

      const result = await deleteNews(1, 1, 'No longer needed');

      expect(result).toEqual(existing);
      expect(prisma.news.delete).toHaveBeenCalledWith({ where: { newsId: 1 } });
      expect(logChangelog).toHaveBeenCalledOnce();
    });

    it('throws when news entry not found', async () => {
      vi.mocked(prisma.news.findUnique).mockResolvedValue(null);
      await expect(deleteNews(999, 1)).rejects.toThrow('News article not found');
    });
  });

  describe('catch-log-rethrow', () => {
    it('getNews rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.news.findMany).mockRejectedValue(dbError);

      await expect(getNews(0, 30)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getNewsById rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.news.findUnique).mockRejectedValue(dbError);

      await expect(getNewsById(1)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('createNews rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.news.create).mockRejectedValue(dbError);

      await expect(createNews(1, {
        title: 'New', content: 'Content', links: null, publishedPublicAt: new Date(),
      })).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('updateNews rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.news.findUnique).mockResolvedValue({
        newsId: 1, title: 'Old', content: 'Content', links: null,
        publishedPublicAt: new Date(), updatedPublicAt: null,
        createdAt: new Date(), updatedAt: new Date(), userId: 1,
      } as never);
      vi.mocked(prisma.news.update).mockRejectedValue(dbError);

      await expect(updateNews(1, { title: 'New' }, 1)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
