import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/about/about.service', () => ({
  getAbout: vi.fn(),
  createAbout: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/modules/about/about.schema', async () => {
  const z = await import('zod');
  return {
    AboutCreateSchema: z.default.object({
      tableName: z.default.string().min(1),
      name: z.default.string().nullable().default(null),
      affiliation: z.default.string().nullable().default(null),
      time: z.default.string().nullable().default(null),
      url: z.default.string().nullable().default(null),
      funding: z.default.string().nullable().default(null),
      comment: z.default.string().nullable().default(null),
    }),
  };
});

import { GET, POST } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getAbout, createAbout } from '@/modules/about/about.service';

describe('/api/about route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 200 with about data', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(null as never);
      const mockData = [{ id: 1, tableName: 'CONTRIBUTOR', name: 'Alice' }];
      vi.mocked(getAbout).mockResolvedValue(mockData as never);

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(mockData);
    });

    it('returns 500 on service error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(null as never);
      vi.mocked(getAbout).mockRejectedValue(new Error('DB error'));

      const response = await GET();
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Internal server error');
    });
  });

  describe('POST', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(null);

      const request = new Request('http://localhost/api/about', {
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

      const request = new Request('http://localhost/api/about', {
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

      const request = new Request('http://localhost/api/about', {
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
      const created = { id: 1, tableName: 'CONTRIBUTOR', name: 'Test' };
      vi.mocked(createAbout).mockResolvedValue(created as never);

      const request = new Request('http://localhost/api/about', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tableName: 'CONTRIBUTOR', name: 'Test' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body).toEqual(created);
    });

    it('returns 500 on service error during creation', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue({
        userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true,
      } as never);
      vi.mocked(createAbout).mockRejectedValue(new Error('DB error'));

      const request = new Request('http://localhost/api/about', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tableName: 'CONTRIBUTOR', name: 'Test' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
    });
  });
});
