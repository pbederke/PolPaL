import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/entries/entries.service', () => ({
  getEntriesByVersionEntity: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { GET } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getEntriesByVersionEntity } from '@/modules/entries/entries.service';
import logger from '@/lib/server/logger.server';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

const mockParams = (polpalId: string, versionKey: string) => ({
  params: Promise.resolve({ polpalId, versionKey }) as Promise<{ polpalId: string; versionKey: string }>,
});

describe('/api/entities/[polpalId]/versions/[versionKey] route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 403 when auth fails', async () => {
      const { NextResponse } = await import('next/server');
      const forbiddenResponse = NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      vi.mocked(enforceRouteAuth).mockResolvedValue(forbiddenResponse as never);

      const response = await GET(
        new Request('http://localhost/api/entities/1/versions/v1'),
        mockParams('1', 'v1'),
      );
      expect(response.status).toBe(403);
    });

    it('returns 200 with entries data', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const mockData = [{ entryId: 1, value: 'test' }];
      vi.mocked(getEntriesByVersionEntity).mockResolvedValue(mockData as never);

      const response = await GET(
        new Request('http://localhost/api/entities/1/versions/v1'),
        mockParams('1', 'v1'),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(mockData);
      expect(getEntriesByVersionEntity).toHaveBeenCalledWith('v1', 1);
    });

    it('returns 400 for invalid ID (zero)', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await GET(
        new Request('http://localhost/api/entities/0/versions/v1'),
        mockParams('0', 'v1'),
      );
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Invalid PolPaL ID');
    });

    it('returns 400 for non-integer ID', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await GET(
        new Request('http://localhost/api/entities/abc/versions/v1'),
        mockParams('abc', 'v1'),
      );
      expect(response.status).toBe(400);
    });

    it('returns 404 when not found', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(getEntriesByVersionEntity).mockResolvedValue(null as never);

      const response = await GET(
        new Request('http://localhost/api/entities/999/versions/v1'),
        mockParams('999', 'v1'),
      );
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Not found');
    });

    it('returns 500 on error and logs', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const error = new Error('DB error');
      vi.mocked(getEntriesByVersionEntity).mockRejectedValue(error);

      const response = await GET(
        new Request('http://localhost/api/entities/1/versions/v1'),
        mockParams('1', 'v1'),
      );
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Internal server error');
      expect(logger.error).toHaveBeenCalledWith(
        { err: error },
        'GET /api/entities/[polpalId]/versions/[versionKey] failed',
      );
    });
  });
});
