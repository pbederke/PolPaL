import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/admin/admin.service', () => ({
  getProjectsAdmin: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { GET } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getProjectsAdmin } from '@/modules/admin/admin.service';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

function makeRequest(url: string) {
  return new NextRequest(url) as never;
}

describe('/api/admin/projects route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      vi.mocked(enforceRouteAuth).mockResolvedValue(NextResponse.json({ message: 'Forbidden' }, { status: 403 } as never) as never,
      );

      const response = await GET(makeRequest('http://localhost/api/admin/projects'));
      expect(response.status).toBe(403);
    });

    it('returns 200 with paginated data (default page)', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const items = [{ id: 1, name: 'Project A' }];
      vi.mocked(getProjectsAdmin).mockResolvedValue({ items, total: 1 } as never);

      const response = await GET(makeRequest('http://localhost/api/admin/projects'));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.items).toEqual(items);
      expect(body.total).toBe(1);
      expect(body.page).toBe(1);
      expect(body.pageCount).toBe(1);
      expect(getProjectsAdmin).toHaveBeenCalledWith(0, 1000);
    });

    it('parses page from search params', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(getProjectsAdmin).mockResolvedValue({ items: [], total: 3000 } as never);

      const response = await GET(makeRequest('http://localhost/api/admin/projects?page=2'));
      const body = await response.json();

      expect(body.page).toBe(2);
      expect(getProjectsAdmin).toHaveBeenCalledWith(1000, 1000);
    });

    it('clamps page to 1 for non-positive values', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(getProjectsAdmin).mockResolvedValue({ items: [], total: 0 } as never);

      await GET(makeRequest('http://localhost/api/admin/projects?page=0'));
      expect(getProjectsAdmin).toHaveBeenCalledWith(0, 1000);

      await GET(makeRequest('http://localhost/api/admin/projects?page=-3'));
      expect(getProjectsAdmin).toHaveBeenCalledWith(0, 1000);
    });

    it('calculates pageCount correctly', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(getProjectsAdmin).mockResolvedValue({ items: [], total: 2500 } as never);

      const response = await GET(makeRequest('http://localhost/api/admin/projects'));
      const body = await response.json();

      expect(body.pageCount).toBe(3);
    });

    it('returns 500 on service error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(getProjectsAdmin).mockRejectedValue(new Error('DB error'));

      const response = await GET(makeRequest('http://localhost/api/admin/projects'));
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Internal server error');
    });
  });
});
