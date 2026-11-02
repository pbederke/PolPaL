import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/entries/entries.service', () => ({
  getEntriesWithLinksForMatching: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { GET } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getEntriesWithLinksForMatching } from '@/modules/entries/entries.service';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

const mockParams = (versionKey: string) => ({
  params: Promise.resolve({ versionKey }) as Promise<{ versionKey: string }>,
});

describe('/api/entries/[versionKey]/with-links route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      const forbiddenResponse = NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      vi.mocked(enforceRouteAuth).mockResolvedValue(forbiddenResponse as never);

      const response = await GET(
        new Request('http://localhost/api/entries/v1/with-links'),
        mockParams('v1'),
      );
      expect(response.status).toBe(403);
    });

    it('returns 200 with entries', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const data = [{ id: 1, versionKey: 'v1', links: [] }];
      vi.mocked(getEntriesWithLinksForMatching).mockResolvedValue(data as never);

      const response = await GET(
        new Request('http://localhost/api/entries/v1/with-links'),
        mockParams('v1'),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(data);
      expect(getEntriesWithLinksForMatching).toHaveBeenCalledWith('v1');
    });

    it('returns 500 on error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(getEntriesWithLinksForMatching).mockRejectedValue(new Error('DB error'));

      const response = await GET(
        new Request('http://localhost/api/entries/v1/with-links'),
        mockParams('v1'),
      );
      expect(response.status).toBe(500);
    });
  });
});
