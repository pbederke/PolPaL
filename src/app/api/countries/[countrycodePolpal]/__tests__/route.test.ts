import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/countries/countries.service', () => ({
  getCountryByCountrycode: vi.fn(),
  updateCountry: vi.fn(),
  deleteCountry: vi.fn(),
}));
vi.mock('@/modules/countries/countries.schema', async () => {
  const z = await import('zod');
  return {
    CountryUpdateSchema: z.default.object({
      countrycodePolpal: z.default.string().min(1).optional(),
      isCountry: z.default.boolean().optional(),
      iso2c: z.default.string().optional().nullable(),
      iso3c: z.default.string().optional().nullable(),
      iso3n: z.default.number().int().optional().nullable(),
      countryname: z.default.string().min(1).optional(),
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

import { GET, PUT, DELETE } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getCountryByCountrycode, updateCountry, deleteCountry } from '@/modules/countries/countries.service';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

const mockParams = (overrides: Record<string, string>) => ({
  params: Promise.resolve(overrides) as Promise<{ countrycodePolpal: string }>,
});

describe('/api/countries/[countrycodePolpal] route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 200 with country', async () => {
      const country = { countrycodePolpal: 'US', countryname: 'United States' };
      vi.mocked(getCountryByCountrycode).mockResolvedValue(country as never);

      const response = await GET(
        new Request('http://localhost/api/countries/US'),
        mockParams({ countrycodePolpal: 'US' }),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(country);
    });

    it('returns 404 when not found', async () => {
      vi.mocked(getCountryByCountrycode).mockResolvedValue(null);

      const response = await GET(
        new Request('http://localhost/api/countries/XX'),
        mockParams({ countrycodePolpal: 'XX' }),
      );
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Country not found');
    });

    it('returns 500 on error', async () => {
      vi.mocked(getCountryByCountrycode).mockRejectedValue(new Error('DB error'));

      const response = await GET(
        new Request('http://localhost/api/countries/US'),
        mockParams({ countrycodePolpal: 'US' }),
      );
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Internal server error');
    });
  });

  describe('PUT', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(null);

      const response = await PUT(
        new Request('http://localhost/api/countries/US', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ countryname: 'Updated' }),
        }),
        mockParams({ countrycodePolpal: 'US' }),
      );
      expect(response.status).toBe(401);
    });

    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      const forbiddenResponse = NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      vi.mocked(enforceRouteAuth).mockResolvedValue(forbiddenResponse as never);

      const response = await PUT(
        new Request('http://localhost/api/countries/US', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ countryname: 'Updated' }),
        }),
        mockParams({ countrycodePolpal: 'US' }),
      );
      expect(response.status).toBe(403);
    });

    it('returns 200 on success', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const updated = { countrycodePolpal: 'US', countryname: 'Updated' };
      vi.mocked(updateCountry).mockResolvedValue(updated as never);

      const response = await PUT(
        new Request('http://localhost/api/countries/US', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ countryname: 'Updated' }),
        }),
        mockParams({ countrycodePolpal: 'US' }),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(updated);
    });

    it('returns 400 on invalid body', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await PUT(
        new Request('http://localhost/api/countries/US', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ countryname: 123 }),
        }),
        mockParams({ countrycodePolpal: 'US' }),
      );
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Invalid request body');
    });
  });

  describe('DELETE', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(null);

      const response = await DELETE(
        new Request('http://localhost/api/countries/US', { method: 'DELETE' }),
        mockParams({ countrycodePolpal: 'US' }),
      );
      expect(response.status).toBe(401);
    });

    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      const forbiddenResponse = NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      vi.mocked(enforceRouteAuth).mockResolvedValue(forbiddenResponse as never);

      const response = await DELETE(
        new Request('http://localhost/api/countries/US', { method: 'DELETE' }),
        mockParams({ countrycodePolpal: 'US' }),
      );
      expect(response.status).toBe(403);
    });

    it('returns 204 on success', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteCountry).mockResolvedValue(undefined as never);

      const response = await DELETE(
        new Request('http://localhost/api/countries/US', { method: 'DELETE' }),
        mockParams({ countrycodePolpal: 'US' }),
      );
      expect(response.status).toBe(204);
    });

    it('returns 500 on error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteCountry).mockRejectedValue(new Error('DB error'));

      const response = await DELETE(
        new Request('http://localhost/api/countries/US', { method: 'DELETE' }),
        mockParams({ countrycodePolpal: 'US' }),
      );
      expect(response.status).toBe(500);
    });
  });
});
