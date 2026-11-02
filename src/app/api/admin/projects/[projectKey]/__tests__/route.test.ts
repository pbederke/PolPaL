import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/admin/admin.service', () => ({
  deleteProjectAdmin: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { DELETE } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { deleteProjectAdmin } from '@/modules/admin/admin.service';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

function mockParams(projectKey: string) {
  return { params: Promise.resolve({ projectKey }) as Promise<{ projectKey: string }> };
}

function makeRequest(url: string, init?: RequestInit) {
  return new Request(url, init) as never;
}

describe('/api/admin/projects/[projectKey] route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('DELETE', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      vi.mocked(enforceRouteAuth).mockResolvedValue(NextResponse.json({ message: 'Forbidden' }, { status: 403 } as never) as never,
      );

      const response = await DELETE(
        makeRequest('http://localhost/api/admin/projects/proj1', { method: 'DELETE' }),
        mockParams('proj1'),
      );
      expect(response.status).toBe(403);
    });

    it('returns 204 on success without body', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteProjectAdmin).mockResolvedValue(undefined as never);

      const response = await DELETE(
        makeRequest('http://localhost/api/admin/projects/proj1', { method: 'DELETE' }),
        mockParams('proj1'),
      );
      expect(response.status).toBe(204);
      expect(deleteProjectAdmin).toHaveBeenCalledWith('proj1', 1, undefined);
    });

    it('returns 204 on success with comment', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteProjectAdmin).mockResolvedValue(undefined as never);

      const response = await DELETE(
        makeRequest('http://localhost/api/admin/projects/proj1', {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ comment: 'Archived project' }),
        }),
        mockParams('proj1'),
      );
      expect(response.status).toBe(204);
      expect(deleteProjectAdmin).toHaveBeenCalledWith('proj1', 1, 'Archived project');
    });

    it('trims and truncates comment to 1000 chars', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteProjectAdmin).mockResolvedValue(undefined as never);
      const longComment = 'a'.repeat(1200);

      await DELETE(
        makeRequest('http://localhost/api/admin/projects/proj1', {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ comment: longComment }),
        }),
        mockParams('proj1'),
      );
      const call = vi.mocked(deleteProjectAdmin).mock.calls[0];
      expect(call[2]).toBe('a'.repeat(1000));
    });

    it('treats whitespace-only comment as undefined', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteProjectAdmin).mockResolvedValue(undefined as never);

      await DELETE(
        makeRequest('http://localhost/api/admin/projects/proj1', {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ comment: '   ' }),
        }),
        mockParams('proj1'),
      );
      expect(deleteProjectAdmin).toHaveBeenCalledWith('proj1', 1, undefined);
    });

    it('returns 409 on P2003 (dependent data)', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const err = Object.assign(new Error('FK violation'), { code: 'P2003' });
      vi.mocked(deleteProjectAdmin).mockRejectedValue(err);

      const response = await DELETE(
        makeRequest('http://localhost/api/admin/projects/proj1', { method: 'DELETE' }),
        mockParams('proj1'),
      );
      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Cannot delete: record has dependent data.');
    });

    it('returns 409 on P2014 (dependent data)', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const err = Object.assign(new Error('FK violation'), { code: 'P2014' });
      vi.mocked(deleteProjectAdmin).mockRejectedValue(err);

      const response = await DELETE(
        makeRequest('http://localhost/api/admin/projects/proj1', { method: 'DELETE' }),
        mockParams('proj1'),
      );
      expect(response.status).toBe(409);
    });

    it('returns 404 on P2025 (not found)', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const err = Object.assign(new Error('not found'), { code: 'P2025' });
      vi.mocked(deleteProjectAdmin).mockRejectedValue(err);

      const response = await DELETE(
        makeRequest('http://localhost/api/admin/projects/proj1', { method: 'DELETE' }),
        mockParams('proj1'),
      );
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Not found');
    });

    it('returns 500 on unexpected error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteProjectAdmin).mockRejectedValue(new Error('unexpected'));

      const response = await DELETE(
        makeRequest('http://localhost/api/admin/projects/proj1', { method: 'DELETE' }),
        mockParams('proj1'),
      );
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Internal server error');
    });
  });
});
