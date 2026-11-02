import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/internal/internal.service', () => ({
  getEntitiesByYearByCountry: vi.fn(),
}));
vi.mock('@/lib/server/auth.server', () => ({
  getAuthPayload: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { GET } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getEntitiesByYearByCountry } from '@/modules/internal/internal.service';
import { getAuthPayload } from '@/lib/server/auth.server';

const mockParams = (countrycodePolpal: string) => ({
  params: Promise.resolve({ countrycodePolpal }) as Promise<{ countrycodePolpal: string }>,
});

describe('/api/internal/entities-by-year/[countrycodePolpal] route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      vi.mocked(enforceRouteAuth).mockResolvedValue(
        NextResponse.json({ message: 'Forbidden' }, { status: 403 } as never) as never,
      );

      const response = await GET(new Request('http://localhost/api/internal/entities-by-year/DEU'), mockParams('DEU'));
      expect(response.status).toBe(403);
    });

    it('returns 200 with entities by year for a country (logged-in user)', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(null);
      vi.mocked(getAuthPayload).mockResolvedValue({ userId: 1, role: 'ADMIN' } as never);
      const data = [{ year: 2020, entityCount: 10 }, { year: 2021, entityCount: 20 }];
      vi.mocked(getEntitiesByYearByCountry).mockResolvedValue(data as never);

      const response = await GET(new Request('http://localhost/api/internal/entities-by-year/DEU'), mockParams('DEU'));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(data);
      expect(getEntitiesByYearByCountry).toHaveBeenCalledWith('DEU', true);
    });

    it('returns 200 with entities by year for a country (anonymous user)', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(null);
      vi.mocked(getAuthPayload).mockResolvedValue(null);
      const data = [{ year: 2020, entityCount: 5 }];
      vi.mocked(getEntitiesByYearByCountry).mockResolvedValue(data as never);

      const response = await GET(new Request('http://localhost/api/internal/entities-by-year/DEU'), mockParams('DEU'));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(data);
      expect(getEntitiesByYearByCountry).toHaveBeenCalledWith('DEU', false);
    });

    it('returns 500 on service error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(null);
      vi.mocked(getAuthPayload).mockResolvedValue(null);
      vi.mocked(getEntitiesByYearByCountry).mockRejectedValue(new Error('DB error'));

      const response = await GET(new Request('http://localhost/api/internal/entities-by-year/DEU'), mockParams('DEU'));
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Internal server error');
    });
  });
});
