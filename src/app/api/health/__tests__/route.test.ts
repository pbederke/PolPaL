import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));

import { GET } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';

describe('/api/health route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      vi.mocked(enforceRouteAuth).mockResolvedValue(NextResponse.json({ message: 'Forbidden' }, { status: 403 } as never) as never,
      );

      const response = await GET();
      expect(response.status).toBe(403);
    });

    it('returns 200 with status ok', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue({
        userId: 1,
        username: 'admin',
        role: 'ADMIN',
        approvedByAdmin: true,
      } as never);

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({ status: 'ok' });
    });
  });
});
