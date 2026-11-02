import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/admin/admin.service', () => ({
  getUserActivityOverview: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { GET } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getUserActivityOverview } from '@/modules/admin/admin.service';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

function makeRequest(url: string) {
  return new NextRequest(url) as never;
}

describe('/api/admin/user-activities route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      vi.mocked(enforceRouteAuth).mockResolvedValue(NextResponse.json({ message: 'Forbidden' }, { status: 403 } as never) as never,
      );

      const response = await GET(makeRequest('http://localhost/api/admin/user-activities'));
      expect(response.status).toBe(403);
    });

    it('returns 401 when auth is null', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(null);

      const response = await GET(makeRequest('http://localhost/api/admin/user-activities'));
      expect(response.status).toBe(401);
    });

    it('returns 200 with data when no query params', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const data = [{ userId: 1, activityCount: 10 }];
      vi.mocked(getUserActivityOverview).mockResolvedValue(data as never);

      const response = await GET(makeRequest('http://localhost/api/admin/user-activities'));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(data);
      expect(getUserActivityOverview).toHaveBeenCalledWith(undefined, undefined);
    });

    it('returns 200 with from/to dates', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(getUserActivityOverview).mockResolvedValue([] as never);

      const response = await GET(
        makeRequest('http://localhost/api/admin/user-activities?from=2024-01-01&to=2024-12-31'),
      );
      expect(response.status).toBe(200);
      expect(getUserActivityOverview).toHaveBeenCalledWith(
        new Date('2024-01-01T00:00:00.000Z'),
        new Date('2024-12-31T23:59:59.999Z'),
      );
    });

    it('returns 400 on invalid date format', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await GET(
        makeRequest('http://localhost/api/admin/user-activities?from=not-a-date'),
      );
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Invalid query parameters');
    });

    it('returns 400 when from is after to', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await GET(
        makeRequest('http://localhost/api/admin/user-activities?from=2024-12-31&to=2024-01-01'),
      );
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('message', '`from` must be before `to`');
    });

    it('returns 500 on service error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(getUserActivityOverview).mockRejectedValue(new Error('DB error'));

      const response = await GET(makeRequest('http://localhost/api/admin/user-activities'));
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Internal server error');
    });
  });
});
