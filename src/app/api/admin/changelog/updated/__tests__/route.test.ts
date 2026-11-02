import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/admin/admin.service', () => ({
  getChangelogByTable: vi.fn(),
  getChangelogTableNames: vi.fn(),
}));
vi.mock('@/lib/shared/enums', () => ({
  ChangeActionEnum: { CREATED: 'CREATED', DELETED: 'DELETED', UPDATED: 'UPDATED' },
  TableNamesEnum: { ABOUT: 'ABOUT', COUNTRIES: 'COUNTRIES', ENTRIES: 'ENTRIES' },
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { GET } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getChangelogByTable, getChangelogTableNames } from '@/modules/admin/admin.service';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

function makeRequest(url: string) {
  return new NextRequest(url) as never;
}

describe('/api/admin/changelog/updated route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      vi.mocked(enforceRouteAuth).mockResolvedValue(NextResponse.json({ message: 'Forbidden' }, { status: 403 } as never) as never,
      );

      const response = await GET(makeRequest('http://localhost/api/admin/changelog/updated'));
      expect(response.status).toBe(403);
    });

    it('returns table names when no tableName param', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(getChangelogTableNames).mockResolvedValue(['COUNTRIES'] as never);

      const response = await GET(makeRequest('http://localhost/api/admin/changelog/updated'));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({ tableNames: ['COUNTRIES'] });
      expect(getChangelogTableNames).toHaveBeenCalledWith('UPDATED');
    });

    it('returns logs for a valid tableName', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const logs = [{ id: 3, action: 'UPDATED', tableName: 'COUNTRIES' }];
      vi.mocked(getChangelogByTable).mockResolvedValue({ logs, totalCount: 1 } as never);

      const response = await GET(
        makeRequest('http://localhost/api/admin/changelog/updated?tableName=COUNTRIES'),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({ logs, totalCount: 1 });
      expect(getChangelogByTable).toHaveBeenCalledWith('UPDATED', 'COUNTRIES');
    });

    it('returns 400 for invalid tableName', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await GET(
        makeRequest('http://localhost/api/admin/changelog/updated?tableName=NOPE'),
      );
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Invalid tableName');
    });

    it('returns 500 on service error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(getChangelogTableNames).mockRejectedValue(new Error('DB error'));

      const response = await GET(makeRequest('http://localhost/api/admin/changelog/updated'));
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Internal server error');
    });
  });
});
