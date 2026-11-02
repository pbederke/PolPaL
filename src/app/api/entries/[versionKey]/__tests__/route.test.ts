import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/entries/entries.service', () => ({
  getEntriesForSync: vi.fn(),
  deleteEntriesByVersion: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { GET, DELETE } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getEntriesForSync, deleteEntriesByVersion } from '@/modules/entries/entries.service';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

const mockParams = (key: string) => ({
  params: Promise.resolve({ versionKey: key }) as Promise<{ versionKey: string }>,
});

describe('/api/entries/[versionKey] route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      const forbiddenResponse = NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      vi.mocked(enforceRouteAuth).mockResolvedValue(forbiddenResponse as never);

      const response = await GET(
        new Request('http://localhost/api/entries/v1'),
        mockParams('v1'),
      );
      expect(response.status).toBe(403);
    });

    it('returns 401 when auth is null', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(null);

      const response = await GET(
        new Request('http://localhost/api/entries/v1'),
        mockParams('v1'),
      );
      expect(response.status).toBe(401);
    });

    it('returns 200 with entries', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const entries = [{ id: 1, versionKey: 'v1' }];
      vi.mocked(getEntriesForSync).mockResolvedValue(entries as never);

      const response = await GET(
        new Request('http://localhost/api/entries/v1'),
        mockParams('v1'),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(entries);
      expect(getEntriesForSync).toHaveBeenCalledWith('v1');
    });

    it('returns 500 on error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(getEntriesForSync).mockRejectedValue(new Error('DB error'));

      const response = await GET(
        new Request('http://localhost/api/entries/v1'),
        mockParams('v1'),
      );
      expect(response.status).toBe(500);
    });
  });

  describe('DELETE', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      const forbiddenResponse = NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      vi.mocked(enforceRouteAuth).mockResolvedValue(forbiddenResponse as never);

      const response = await DELETE(
        new Request('http://localhost/api/entries/v1', { method: 'DELETE' }),
        mockParams('v1'),
      );
      expect(response.status).toBe(403);
    });

    it('returns 401 when auth is null', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(null);

      const response = await DELETE(
        new Request('http://localhost/api/entries/v1', { method: 'DELETE' }),
        mockParams('v1'),
      );
      expect(response.status).toBe(401);
    });

    it('returns 204 on success', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteEntriesByVersion).mockResolvedValue(undefined as never);

      const response = await DELETE(
        new Request('http://localhost/api/entries/v1', { method: 'DELETE' }),
        mockParams('v1'),
      );
      expect(response.status).toBe(204);
      expect(deleteEntriesByVersion).toHaveBeenCalledWith('v1');
    });

    it('returns 500 on error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteEntriesByVersion).mockRejectedValue(new Error('DB error'));

      const response = await DELETE(
        new Request('http://localhost/api/entries/v1', { method: 'DELETE' }),
        mockParams('v1'),
      );
      expect(response.status).toBe(500);
    });
  });
});
