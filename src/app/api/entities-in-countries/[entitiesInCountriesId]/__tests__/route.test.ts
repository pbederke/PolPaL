import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/entities-in-countries/entities-in-countries.service', () => ({
  deleteEntitiesInCountries: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { DELETE } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { deleteEntitiesInCountries } from '@/modules/entities-in-countries/entities-in-countries.service';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

const mockParams = (id: string) => ({
  params: Promise.resolve({ entitiesInCountriesId: id }) as Promise<{ entitiesInCountriesId: string }>,
});

describe('/api/entities-in-countries/[entitiesInCountriesId] route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('DELETE', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      const forbiddenResponse = NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      vi.mocked(enforceRouteAuth).mockResolvedValue(forbiddenResponse as never);

      const response = await DELETE(
        new Request('http://localhost/api/entities-in-countries/1', { method: 'DELETE' }),
        mockParams('1'),
      );
      expect(response.status).toBe(403);
    });

    it('returns 400 for invalid ID (zero)', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await DELETE(
        new Request('http://localhost/api/entities-in-countries/0', { method: 'DELETE' }),
        mockParams('0'),
      );
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Invalid ID');
    });

    it('returns 400 for non-integer ID', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await DELETE(
        new Request('http://localhost/api/entities-in-countries/abc', { method: 'DELETE' }),
        mockParams('abc'),
      );
      expect(response.status).toBe(400);
    });

    it('returns 400 for negative ID', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await DELETE(
        new Request('http://localhost/api/entities-in-countries/-1', { method: 'DELETE' }),
        mockParams('-1'),
      );
      expect(response.status).toBe(400);
    });

    it('returns 204 on success', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteEntitiesInCountries).mockResolvedValue(undefined as never);

      const response = await DELETE(
        new Request('http://localhost/api/entities-in-countries/1', { method: 'DELETE' }),
        mockParams('1'),
      );
      expect(response.status).toBe(204);
      expect(deleteEntitiesInCountries).toHaveBeenCalledWith(1, 1, undefined);
    });

    it('returns 204 with comment on success', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteEntitiesInCountries).mockResolvedValue(undefined as never);

      const response = await DELETE(
        new Request('http://localhost/api/entities-in-countries/1', {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ comment: 'test comment' }),
        }),
        mockParams('1'),
      );
      expect(response.status).toBe(204);
      expect(deleteEntitiesInCountries).toHaveBeenCalledWith(1, 1, 'test comment');
    });

    it('returns 500 on error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteEntitiesInCountries).mockRejectedValue(new Error('DB error'));

      const response = await DELETE(
        new Request('http://localhost/api/entities-in-countries/1', { method: 'DELETE' }),
        mockParams('1'),
      );
      expect(response.status).toBe(500);
    });
  });
});
