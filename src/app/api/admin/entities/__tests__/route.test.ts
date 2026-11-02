import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/admin/admin.service', () => ({
  getEntitiesAdmin: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { GET } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getEntitiesAdmin } from '@/modules/admin/admin.service';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

function makeRequest(url: string) {
  return new NextRequest(url) as never;
}

describe('/api/admin/entities route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      const forbiddenResponse = NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      vi.mocked(enforceRouteAuth).mockResolvedValue(forbiddenResponse as never);

      const response = await GET(makeRequest('http://localhost/api/admin/entities'));
      expect(response.status).toBe(403);
    });

    it('returns 200 with paginated data (default page 1)', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const items = [{ id: 1, nameShort: 'Entity' }];
      vi.mocked(getEntitiesAdmin).mockResolvedValue({ items, total: 1 } as never);

      const response = await GET(makeRequest('http://localhost/api/admin/entities'));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.items).toEqual(items);
      expect(body.total).toBe(1);
      expect(body.page).toBe(1);
      expect(body.pageCount).toBe(1);
      expect(getEntitiesAdmin).toHaveBeenCalledWith(0, 1000);
    });

    it('returns correct pagination for page 2', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(getEntitiesAdmin).mockResolvedValue({ items: [], total: 2500 } as never);

      const response = await GET(makeRequest('http://localhost/api/admin/entities?page=2'));
      const body = await response.json();

      expect(body.page).toBe(2);
      expect(body.pageCount).toBe(3);
      expect(getEntitiesAdmin).toHaveBeenCalledWith(1000, 1000);
    });

    it('clamps page to minimum 1', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(getEntitiesAdmin).mockResolvedValue({ items: [], total: 0 } as never);

      await GET(makeRequest('http://localhost/api/admin/entities?page=-5'));

      expect(getEntitiesAdmin).toHaveBeenCalledWith(0, 1000);
    });

    it('returns 500 on error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(getEntitiesAdmin).mockRejectedValue(new Error('DB error'));

      const response = await GET(makeRequest('http://localhost/api/admin/entities'));
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Internal server error');
    });
  });
});
