import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/entries/entries.service', () => ({
  getGroupedEntriesByCountry: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { GET } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getGroupedEntriesByCountry } from '@/modules/entries/entries.service';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

const mockParams = (versionKey: string) => ({
  params: Promise.resolve({ versionKey }) as Promise<{ versionKey: string }>,
});

describe('/api/entries/countries/[versionKey] route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      const forbiddenResponse = NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      vi.mocked(enforceRouteAuth).mockResolvedValue(forbiddenResponse as never);

      const response = await GET(
        new Request('http://localhost/api/entries/countries/v1'),
        mockParams('v1'),
      );
      expect(response.status).toBe(403);
    });

    it('returns 200 with grouped entries', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const data = [{ countrycodePolpal: 'PL', entries: [{ id: 1 }] }];
      vi.mocked(getGroupedEntriesByCountry).mockResolvedValue(data as never);

      const response = await GET(
        new Request('http://localhost/api/entries/countries/v1'),
        mockParams('v1'),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(data);
      expect(getGroupedEntriesByCountry).toHaveBeenCalledWith('v1');
    });

    it('returns 404 when version not found', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(getGroupedEntriesByCountry).mockResolvedValue(null as never);

      const response = await GET(
        new Request('http://localhost/api/entries/countries/nonexistent'),
        mockParams('nonexistent'),
      );
      expect(response.status).toBe(404);
    });

    it('returns 500 on error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(getGroupedEntriesByCountry).mockRejectedValue(new Error('DB error'));

      const response = await GET(
        new Request('http://localhost/api/entries/countries/v1'),
        mockParams('v1'),
      );
      expect(response.status).toBe(500);
    });
  });
});
