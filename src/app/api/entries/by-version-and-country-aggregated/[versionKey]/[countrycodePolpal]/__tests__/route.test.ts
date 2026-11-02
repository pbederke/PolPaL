import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/entries/entries.service', () => ({
  getEntriesByVersionCountryAggregated: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { GET } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getEntriesByVersionCountryAggregated } from '@/modules/entries/entries.service';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

const mockParams = (versionKey: string, countrycodePolpal: string) => ({
  params: Promise.resolve({ versionKey, countrycodePolpal }) as Promise<{ versionKey: string; countrycodePolpal: string }>,
});

describe('/api/entries/by-version-and-country-aggregated/[versionKey]/[countrycodePolpal] route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      const forbiddenResponse = NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      vi.mocked(enforceRouteAuth).mockResolvedValue(forbiddenResponse as never);

      const response = await GET(
        new Request('http://localhost/api/entries/by-version-and-country-aggregated/v1/PL'),
        mockParams('v1', 'PL'),
      );
      expect(response.status).toBe(403);
    });

    it('returns 200 with aggregated entries', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const data = [{ id: 1, versionKey: 'v1', countrycodePolpal: 'PL', count: 10 }];
      vi.mocked(getEntriesByVersionCountryAggregated).mockResolvedValue(data as never);

      const response = await GET(
        new Request('http://localhost/api/entries/by-version-and-country-aggregated/v1/PL'),
        mockParams('v1', 'PL'),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(data);
      expect(getEntriesByVersionCountryAggregated).toHaveBeenCalledWith('v1', 'PL');
    });

    it('returns 500 on error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(getEntriesByVersionCountryAggregated).mockRejectedValue(new Error('DB error'));

      const response = await GET(
        new Request('http://localhost/api/entries/by-version-and-country-aggregated/v1/PL'),
        mockParams('v1', 'PL'),
      );
      expect(response.status).toBe(500);
    });
  });
});
