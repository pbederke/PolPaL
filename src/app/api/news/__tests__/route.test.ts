import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/news/news.service', () => ({
  getNews: vi.fn(),
  createNews: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/modules/news/news.schema', async () => {
  const z = await import('zod');
  return {
    NewsCreateSchema: z.default.object({
      title: z.default.string().min(1),
      content: z.default.string().min(1),
      links: z.default.array(z.default.string().min(1)).optional().nullable(),
      publishedPublicAt: z.default.string().min(1),
      updatedPublicAt: z.default.string().optional().nullable(),
    }),
  };
});

import { GET, POST } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getNews, createNews } from '@/modules/news/news.service';

describe('/api/news route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 200 with news data', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(null as never);
      const mockData = [{ id: 1, title: 'Test News', content: 'Content' }];
      vi.mocked(getNews).mockResolvedValue(mockData as never);

      const request = new Request('http://localhost/api/news?skip=0&take=30');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(mockData);
      expect(getNews).toHaveBeenCalledWith(0, 30);
    });

    it('returns 500 on service error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(null as never);
      vi.mocked(getNews).mockRejectedValue(new Error('DB error'));

      const request = new Request('http://localhost/api/news');
      const response = await GET(request);
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Internal server error');
    });
  });

  describe('POST', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(null);

      const request = new Request('http://localhost/api/news', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('returns 403 when auth fails', async () => {
      const { NextResponse } = await import('next/server');
      const forbiddenResponse = NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      vi.mocked(enforceRouteAuth).mockResolvedValue(forbiddenResponse as never);

      const request = new Request('http://localhost/api/news', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it('returns 400 on invalid request body', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue({
        userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true,
      } as never);

      const request = new Request('http://localhost/api/news', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ invalid: 'data' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Invalid request body');
    });

    it('returns 201 on successful creation', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue({
        userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true,
      } as never);
      const created = { id: 1, title: 'New Article', content: 'Content' };
      vi.mocked(createNews).mockResolvedValue(created as never);

      const request = new Request('http://localhost/api/news', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: 'New Article',
          content: 'Content',
          publishedPublicAt: '2024-01-01',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body).toEqual(created);
    });
  });
});
