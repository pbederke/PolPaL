import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/admin/admin.service', () => ({
  deleteLinkEntryEntityAdmin: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { DELETE } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { deleteLinkEntryEntityAdmin } from '@/modules/admin/admin.service';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

function mockParams(linkId: string) {
  return { params: Promise.resolve({ linkId }) as Promise<{ linkId: string }> };
}

function makeRequest(url: string, init?: RequestInit) {
  return new Request(url, init) as never;
}

describe('/api/admin/link-entries-entities/[linkId] route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('DELETE', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      vi.mocked(enforceRouteAuth).mockResolvedValue(NextResponse.json({ message: 'Forbidden' }, { status: 403 } as never) as never,
      );

      const response = await DELETE(
        makeRequest('http://localhost/api/admin/link-entries-entities/5', { method: 'DELETE' }),
        mockParams('5'),
      );
      expect(response.status).toBe(403);
    });

    it('returns 400 for invalid ID (non-numeric)', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await DELETE(
        makeRequest('http://localhost/api/admin/link-entries-entities/abc', { method: 'DELETE' }),
        mockParams('abc'),
      );
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Invalid ID');
    });

    it('returns 400 for invalid ID (zero)', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await DELETE(
        makeRequest('http://localhost/api/admin/link-entries-entities/0', { method: 'DELETE' }),
        mockParams('0'),
      );
      expect(response.status).toBe(400);
    });

    it('returns 400 for invalid ID (negative)', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await DELETE(
        makeRequest('http://localhost/api/admin/link-entries-entities/-1', { method: 'DELETE' }),
        mockParams('-1'),
      );
      expect(response.status).toBe(400);
    });

    it('returns 204 on success', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteLinkEntryEntityAdmin).mockResolvedValue(undefined as never);

      const response = await DELETE(
        makeRequest('http://localhost/api/admin/link-entries-entities/5', { method: 'DELETE' }),
        mockParams('5'),
      );
      expect(response.status).toBe(204);
      expect(deleteLinkEntryEntityAdmin).toHaveBeenCalledWith(5, 1, undefined);
    });

    it('passes comment from request body', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteLinkEntryEntityAdmin).mockResolvedValue(undefined as never);

      const response = await DELETE(
        makeRequest('http://localhost/api/admin/link-entries-entities/5', {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ comment: 'test note' }),
        }),
        mockParams('5'),
      );
      expect(response.status).toBe(204);
      expect(deleteLinkEntryEntityAdmin).toHaveBeenCalledWith(5, 1, 'test note');
    });

    it('returns 409 on P2003 (dependent data)', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const err = Object.assign(new Error('foreign key'), { code: 'P2003' });
      vi.mocked(deleteLinkEntryEntityAdmin).mockRejectedValue(err);

      const response = await DELETE(
        makeRequest('http://localhost/api/admin/link-entries-entities/5', { method: 'DELETE' }),
        mockParams('5'),
      );
      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Cannot delete: record has dependent data.');
    });

    it('returns 409 on P2014 (dependent data)', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const err = Object.assign(new Error('dependent'), { code: 'P2014' });
      vi.mocked(deleteLinkEntryEntityAdmin).mockRejectedValue(err);

      const response = await DELETE(
        makeRequest('http://localhost/api/admin/link-entries-entities/5', { method: 'DELETE' }),
        mockParams('5'),
      );
      expect(response.status).toBe(409);
    });

    it('returns 404 on P2025 (not found)', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const err = Object.assign(new Error('not found'), { code: 'P2025' });
      vi.mocked(deleteLinkEntryEntityAdmin).mockRejectedValue(err);

      const response = await DELETE(
        makeRequest('http://localhost/api/admin/link-entries-entities/999', { method: 'DELETE' }),
        mockParams('999'),
      );
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Not found');
    });

    it('returns 500 on unexpected error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteLinkEntryEntityAdmin).mockRejectedValue(new Error('unexpected'));

      const response = await DELETE(
        makeRequest('http://localhost/api/admin/link-entries-entities/5', { method: 'DELETE' }),
        mockParams('5'),
      );
      expect(response.status).toBe(500);
    });
  });
});
