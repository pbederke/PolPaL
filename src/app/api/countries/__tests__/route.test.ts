import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/countries/countries.service', () => ({
  getCountries: vi.fn(),
  createCountry: vi.fn(),
}));
vi.mock('@/modules/countries/countries.schema', async () => {
  const z = await import('zod');
  return {
    CountryCreateSchema: z.default.object({
      countrycodePolpal: z.default.string().min(1),
      isCountry: z.default.boolean(),
      iso2c: z.default.string().optional().nullable(),
      iso3c: z.default.string().optional().nullable(),
      iso3n: z.default.number().int().optional().nullable(),
      countryname: z.default.string().min(1),
      region: z.default.string().optional().nullable(),
      regionCode: z.default.number().int().optional().nullable(),
      regionSub: z.default.string().optional().nullable(),
      regionSubCode: z.default.number().int().optional().nullable(),
      regionIntermediate: z.default.string().optional().nullable(),
      regionIntermediateCode: z.default.number().int().optional().nullable(),
      wikidataId: z.default.string().optional().nullable(),
    }),
  };
});
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { GET, POST } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getCountries, createCountry } from '@/modules/countries/countries.service';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

describe('/api/countries route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 200 with data', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(null as never);
      const mockData = [{ countrycodePolpal: 'US', countryname: 'United States' }];
      vi.mocked(getCountries).mockResolvedValue(mockData as never);

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(mockData);
    });

    it('returns 500 on error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(null as never);
      vi.mocked(getCountries).mockRejectedValue(new Error('DB error'));

      const response = await GET();
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Internal server error');
    });
  });

  describe('POST', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(null);

      const request = new Request('http://localhost/api/countries', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      const forbiddenResponse = NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      vi.mocked(enforceRouteAuth).mockResolvedValue(forbiddenResponse as never);

      const request = new Request('http://localhost/api/countries', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it('returns 400 on invalid body', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const request = new Request('http://localhost/api/countries', {
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
      const created = { countrycodePolpal: 'DE', countryname: 'Germany' };
      vi.mocked(createCountry).mockResolvedValue(created as never);

      const request = new Request('http://localhost/api/countries', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ countrycodePolpal: 'DE', isCountry: true, countryname: 'Germany' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body).toEqual(created);
    });

    it('returns 409 on unique constraint error (P2002)', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(createCountry).mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint', {
          clientVersion: '0.0.0',
          code: 'P2002',
          meta: { target: ['countrycodePolpal'] },
        }),
      );

      const request = new Request('http://localhost/api/countries', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ countrycodePolpal: 'DE', isCountry: true, countryname: 'Germany' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'countrycodePolpal already assigned to another country');
    });

    it('returns 500 on unexpected error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(createCountry).mockRejectedValue(new Error('DB error'));

      const request = new Request('http://localhost/api/countries', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ countrycodePolpal: 'DE', isCountry: true, countryname: 'Germany' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
    });
  });
});
