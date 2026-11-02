import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/internal/internal.service', () => ({
  getStats: vi.fn(),
}));
vi.mock('@/lib/server/auth.server', () => ({
  getAuthPayload: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { GET } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getStats } from '@/modules/internal/internal.service';
import { getAuthPayload } from '@/lib/server/auth.server';

describe('/api/internal/statistics route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      vi.mocked(enforceRouteAuth).mockResolvedValue(NextResponse.json({ message: 'Forbidden' }, { status: 403 } as never) as never,
      );

      const response = await GET();
      expect(response.status).toBe(403);
    });

    it('returns 200 with stats for logged-in user', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(null);
      vi.mocked(getAuthPayload).mockResolvedValue({ userId: 1, role: 'ADMIN' } as never);
      const stats = { totalEntities: 100, totalEntries: 500 };
      vi.mocked(getStats).mockResolvedValue(stats as never);

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(stats);
      expect(getStats).toHaveBeenCalledWith(true);
    });

    it('returns 200 with stats for anonymous user', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(null);
      vi.mocked(getAuthPayload).mockResolvedValue(null);
      const stats = { totalEntities: 100, totalEntries: 500 };
      vi.mocked(getStats).mockResolvedValue(stats as never);

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(stats);
      expect(getStats).toHaveBeenCalledWith(false);
    });

    it('returns 404 when stats not found', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(null);
      vi.mocked(getAuthPayload).mockResolvedValue(null);
      vi.mocked(getStats).mockResolvedValue(null);

      const response = await GET();
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Stats not found');
    });

    it('returns 500 on service error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(null);
      vi.mocked(getAuthPayload).mockResolvedValue(null);
      vi.mocked(getStats).mockRejectedValue(new Error('DB error'));

      const response = await GET();
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Internal server error');
    });
  });
});
