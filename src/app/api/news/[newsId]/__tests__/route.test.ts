import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/news/news.service', () => ({
  getNewsById: vi.fn(),
  updateNews: vi.fn(),
  deleteNews: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/modules/news/news.schema', async () => {
  const z = await import('zod');
  return {
    NewsUpdateSchema: z.default.object({
      title: z.default.string().min(1).optional(),
      content: z.default.string().min(1).optional(),
      links: z.default.array(z.default.string().min(1)).optional().nullable(),
      publishedPublicAt: z.default.string().min(1).optional(),
      updatedPublicAt: z.default.string().optional().nullable(),
    }),
  };
});

import { GET, PUT, DELETE } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getNewsById, updateNews, deleteNews } from '@/modules/news/news.service';

describe('/api/news/[newsId] route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 200 with news data', async () => {
      const mockData = { id: 1, title: 'Test', content: 'Content' };
      vi.mocked(getNewsById).mockResolvedValue(mockData as never);

      const request = new Request('http://localhost/api/news/1');
      const response = await GET(request, { params: Promise.resolve({ newsId: '1' }) });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(mockData);
      expect(getNewsById).toHaveBeenCalledWith(1);
    });

    it('returns 400 for invalid news ID', async () => {
      const request = new Request('http://localhost/api/news/abc');
      const response = await GET(request, { params: Promise.resolve({ newsId: 'abc' }) });
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Invalid news ID');
    });

    it('returns 404 when news not found', async () => {
      vi.mocked(getNewsById).mockResolvedValue(null);

      const request = new Request('http://localhost/api/news/999');
      const response = await GET(request, { params: Promise.resolve({ newsId: '999' }) });
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'News not found');
    });
  });

  describe('PUT', () => {
    it('returns 200 on successful update', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue({
        userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true,
      } as never);
      const updated = { id: 1, title: 'Updated' };
      vi.mocked(updateNews).mockResolvedValue(updated as never);

      const request = new Request('http://localhost/api/news/1', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Updated' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ newsId: '1' }) });
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual(updated);
    });

    it('returns 400 for invalid news ID', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue({
        userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true,
      } as never);

      const request = new Request('http://localhost/api/news/abc', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Updated' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ newsId: 'abc' }) });
      expect(response.status).toBe(400);
    });
  });

  describe('DELETE', () => {
    it('returns 204 on successful deletion', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue({
        userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true,
      } as never);
      vi.mocked(deleteNews).mockResolvedValue(undefined as never);

      const request = new Request('http://localhost/api/news/1', { method: 'DELETE' });
      const response = await DELETE(request, { params: Promise.resolve({ newsId: '1' }) });
      expect(response.status).toBe(204);
      expect(deleteNews).toHaveBeenCalledWith(1, 1, undefined);
    });

    it('returns 400 for invalid news ID', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue({
        userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true,
      } as never);

      const request = new Request('http://localhost/api/news/abc', { method: 'DELETE' });
      const response = await DELETE(request, { params: Promise.resolve({ newsId: 'abc' }) });
      expect(response.status).toBe(400);
    });
  });
});
