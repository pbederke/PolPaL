import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/entries/entries.service', () => ({
  getEntryByEntryId: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { GET } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getEntryByEntryId } from '@/modules/entries/entries.service';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

const mockParams = (uniqueObservationId: string) => ({
  params: Promise.resolve({ uniqueObservationId }) as Promise<{ uniqueObservationId: string }>,
});

describe('/api/entries/by-entryId/[uniqueObservationId] route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      const forbiddenResponse = NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      vi.mocked(enforceRouteAuth).mockResolvedValue(forbiddenResponse as never);

      const response = await GET(
        new Request('http://localhost/api/entries/by-entryId/42'),
        mockParams('42'),
      );
      expect(response.status).toBe(403);
    });

    it('returns 400 for invalid entry ID', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await GET(
        new Request('http://localhost/api/entries/by-entryId/abc'),
        mockParams('abc'),
      );
      expect(response.status).toBe(400);
    });

    it('returns 404 when entry not found', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(getEntryByEntryId).mockResolvedValue(null as never);

      const response = await GET(
        new Request('http://localhost/api/entries/by-entryId/999'),
        mockParams('999'),
      );
      expect(response.status).toBe(404);
    });

    it('returns 200 with entry', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const entry = { id: 42, name: 'test' };
      vi.mocked(getEntryByEntryId).mockResolvedValue(entry as never);

      const response = await GET(
        new Request('http://localhost/api/entries/by-entryId/42'),
        mockParams('42'),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(entry);
      expect(getEntryByEntryId).toHaveBeenCalledWith(42);
    });

    it('returns 500 on error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(getEntryByEntryId).mockRejectedValue(new Error('DB error'));

      const response = await GET(
        new Request('http://localhost/api/entries/by-entryId/42'),
        mockParams('42'),
      );
      expect(response.status).toBe(500);
    });
  });
});
