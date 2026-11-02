import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/internal/internal.service', () => ({
  getEntitiesByYear: vi.fn(),
}));
vi.mock('@/lib/server/auth.server', () => ({
  getAuthPayload: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { GET } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getEntitiesByYear } from '@/modules/internal/internal.service';
import { getAuthPayload } from '@/lib/server/auth.server';

describe('/api/internal/entities-by-year route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      vi.mocked(enforceRouteAuth).mockResolvedValue(NextResponse.json({ message: 'Forbidden' }, { status: 403 } as never) as never,
      );

      const response = await GET();
      expect(response.status).toBe(403);
    });

    it('returns 200 with entities by year for logged-in user', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(null);
      vi.mocked(getAuthPayload).mockResolvedValue({ userId: 1, role: 'ADMIN' } as never);
      const data = [{ year: 2020, count: 10 }, { year: 2021, count: 20 }];
      vi.mocked(getEntitiesByYear).mockResolvedValue(data as never);

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(data);
      expect(getEntitiesByYear).toHaveBeenCalledWith(true);
    });

    it('returns 200 with entities by year for anonymous user', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(null);
      vi.mocked(getAuthPayload).mockResolvedValue(null);
      const data = [{ year: 2020, count: 5 }];
      vi.mocked(getEntitiesByYear).mockResolvedValue(data as never);

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(data);
      expect(getEntitiesByYear).toHaveBeenCalledWith(false);
    });

    it('returns 500 on service error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(null);
      vi.mocked(getAuthPayload).mockResolvedValue(null);
      vi.mocked(getEntitiesByYear).mockRejectedValue(new Error('DB error'));

      const response = await GET();
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Internal server error');
    });
  });
});
