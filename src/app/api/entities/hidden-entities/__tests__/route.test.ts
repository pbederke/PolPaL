import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/entities/entities.service', () => ({
  getHiddenEntities: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { GET } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getHiddenEntities } from '@/modules/entities/entities.service';
import logger from '@/lib/server/logger.server';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

describe('/api/entities/hidden-entities route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 403 when auth fails', async () => {
      const { NextResponse } = await import('next/server');
      const forbiddenResponse = NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      vi.mocked(enforceRouteAuth).mockResolvedValue(forbiddenResponse as never);

      const response = await GET();
      expect(response.status).toBe(403);
    });

    it('returns 401 when auth returns null', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(null as never);

      const response = await GET();
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Unauthorized');
    });

    it('returns 200 with hidden entities', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const mockData = [{ polpalId: 1, nameShort: 'Hidden Entity', isHidden: true }];
      vi.mocked(getHiddenEntities).mockResolvedValue(mockData as never);

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(mockData);
    });

    it('returns 500 on error and logs', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const error = new Error('DB error');
      vi.mocked(getHiddenEntities).mockRejectedValue(error);

      const response = await GET();
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Internal server error');
      expect(logger.error).toHaveBeenCalledWith(
        { err: error },
        'GET /api/entities/hidden-entities failed',
      );
    });
  });
});
