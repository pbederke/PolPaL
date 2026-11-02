import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/entities/entities.service', () => ({
  getUpdatePolpalId: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { GET } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getUpdatePolpalId } from '@/modules/entities/entities.service';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

const mockParams = (polpalId: string) => ({
  params: Promise.resolve({ polpalId }) as Promise<{ polpalId: string }>,
});

describe('/api/entities/[polpalId]/edit route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 403 when auth fails', async () => {
      const { NextResponse } = await import('next/server');
      const forbiddenResponse = NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      vi.mocked(enforceRouteAuth).mockResolvedValue(forbiddenResponse as never);

      const response = await GET(
        new Request('http://localhost/api/entities/1/edit'),
        mockParams('1'),
      );
      expect(response.status).toBe(403);
    });

    it('returns 200 with entity data', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const mockData = { polpalId: 1, nameShort: 'Test Entity', nameEnglish: 'Test Entity' };
      vi.mocked(getUpdatePolpalId).mockResolvedValue(mockData as never);

      const response = await GET(
        new Request('http://localhost/api/entities/1/edit'),
        mockParams('1'),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(mockData);
      expect(getUpdatePolpalId).toHaveBeenCalledWith(1);
    });

    it('returns 400 for invalid ID (zero)', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await GET(
        new Request('http://localhost/api/entities/0/edit'),
        mockParams('0'),
      );
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Invalid PolPaL ID');
    });

    it('returns 400 for non-integer ID', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await GET(
        new Request('http://localhost/api/entities/abc/edit'),
        mockParams('abc'),
      );
      expect(response.status).toBe(400);
    });

    it('returns 404 when entity not found', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(getUpdatePolpalId).mockResolvedValue(null as never);

      const response = await GET(
        new Request('http://localhost/api/entities/999/edit'),
        mockParams('999'),
      );
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Entity not found');
    });

    it('returns 500 on error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(getUpdatePolpalId).mockRejectedValue(new Error('DB error'));

      const response = await GET(
        new Request('http://localhost/api/entities/1/edit'),
        mockParams('1'),
      );
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Internal server error');
    });
  });
});
