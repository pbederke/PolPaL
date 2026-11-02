import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/entities-in-countries/entities-in-countries.service', () => ({
  getEntitiesInCountries: vi.fn(),
  createEntitiesInCountries: vi.fn(),
}));
vi.mock('@/modules/entities-in-countries/entities-in-countries.schema', async () => {
  const z = await import('zod');
  return {
    EntityInCountryCreateSchema: z.default.object({
      polpalId: z.default.number().int(),
      countrycodePolpal: z.default.string().min(1),
      comment: z.default.string().optional().nullable(),
    }),
  };
});
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { GET, POST } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getEntitiesInCountries, createEntitiesInCountries } from '@/modules/entities-in-countries/entities-in-countries.service';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

describe('/api/entities-in-countries route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 200 with data', async () => {
      const mockData = [{ polpalId: 1, countrycodePolpal: 'US' }];
      vi.mocked(getEntitiesInCountries).mockResolvedValue(mockData as never);

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(mockData);
    });

    it('returns 500 on error', async () => {
      vi.mocked(getEntitiesInCountries).mockRejectedValue(new Error('DB error'));

      const response = await GET();
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Internal server error');
    });
  });

  describe('POST', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      const forbiddenResponse = NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      vi.mocked(enforceRouteAuth).mockResolvedValue(forbiddenResponse as never);

      const request = new Request('http://localhost/api/entities-in-countries', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it('returns 400 on invalid body', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const request = new Request('http://localhost/api/entities-in-countries', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ invalid: 'data' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Invalid request body');
    });

    it('returns 201 on success', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const created = { id: 1, polpalId: 1, countrycodePolpal: 'US' };
      vi.mocked(createEntitiesInCountries).mockResolvedValue(created as never);

      const request = new Request('http://localhost/api/entities-in-countries', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ polpalId: 1, countrycodePolpal: 'us' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body).toEqual(created);
      expect(createEntitiesInCountries).toHaveBeenCalledWith(1, {
        polpalId: 1,
        countrycodePolpal: 'US',
        comment: undefined,
      });
    });

    it('returns 500 on service error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(createEntitiesInCountries).mockRejectedValue(new Error('DB error'));

      const request = new Request('http://localhost/api/entities-in-countries', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ polpalId: 1, countrycodePolpal: 'us' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
    });
  });
});
