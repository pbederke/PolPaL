import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/admin/admin.service', () => ({
  getApproveUserAdmin: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { GET } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getApproveUserAdmin } from '@/modules/admin/admin.service';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(url, init) as never;
}

describe('/api/admin/approveUsers route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      vi.mocked(enforceRouteAuth).mockResolvedValue(NextResponse.json({ message: 'Forbidden' }, { status: 403 } as never) as never,
      );

      const response = await GET(makeRequest('http://localhost/api/admin/approveUsers'));
      expect(response.status).toBe(403);
    });

    it('returns 200 with data', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const data = [{ id: 1, username: 'alice', approvedByAdmin: false }];
      vi.mocked(getApproveUserAdmin).mockResolvedValue(data as never);

      const response = await GET(makeRequest('http://localhost/api/admin/approveUsers'));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(data);
    });

    it('returns 500 on service error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(getApproveUserAdmin).mockRejectedValue(new Error('DB error'));

      const response = await GET(makeRequest('http://localhost/api/admin/approveUsers'));
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Internal server error');
    });
  });
});
