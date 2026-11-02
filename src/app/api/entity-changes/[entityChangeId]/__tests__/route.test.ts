import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/entity-changes/entity-changes.service', () => ({
  deleteEntityChange: vi.fn(),
  updateEntityChange: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { DELETE, PATCH } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { deleteEntityChange, updateEntityChange } from '@/modules/entity-changes/entity-changes.service';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

function mockParams(entityChangeId: string) {
  return { params: Promise.resolve({ entityChangeId }) as Promise<{ entityChangeId: string }> };
}

function makeRequest(url: string, init?: RequestInit) {
  return new Request(url, init) as never;
}

describe('/api/entity-changes/[entityChangeId] route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('DELETE', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      vi.mocked(enforceRouteAuth).mockResolvedValue(NextResponse.json({ message: 'Forbidden' }, { status: 403 } as never) as never,
      );

      const response = await DELETE(
        makeRequest('http://localhost/api/entity-changes/5', { method: 'DELETE' }),
        mockParams('5'),
      );
      expect(response.status).toBe(403);
    });

    it('returns 400 for non-numeric id', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await DELETE(
        makeRequest('http://localhost/api/entity-changes/abc', { method: 'DELETE' }),
        mockParams('abc'),
      );
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Invalid entity change ID');
    });

    it('returns 400 for zero id', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await DELETE(
        makeRequest('http://localhost/api/entity-changes/0', { method: 'DELETE' }),
        mockParams('0'),
      );
      expect(response.status).toBe(400);
    });

    it('returns 400 for negative id', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await DELETE(
        makeRequest('http://localhost/api/entity-changes/-1', { method: 'DELETE' }),
        mockParams('-1'),
      );
      expect(response.status).toBe(400);
    });

    it('returns 204 on success without body', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteEntityChange).mockResolvedValue(undefined as never);

      const response = await DELETE(
        makeRequest('http://localhost/api/entity-changes/5', { method: 'DELETE' }),
        mockParams('5'),
      );
      expect(response.status).toBe(204);
      expect(deleteEntityChange).toHaveBeenCalledWith(5, 1, undefined);
    });

    it('returns 204 on success with comment', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteEntityChange).mockResolvedValue(undefined as never);

      const response = await DELETE(
        makeRequest('http://localhost/api/entity-changes/5', {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ comment: 'Incorrect change' }),
        }),
        mockParams('5'),
      );
      expect(response.status).toBe(204);
      expect(deleteEntityChange).toHaveBeenCalledWith(5, 1, 'Incorrect change');
    });

    it('returns 500 on service error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteEntityChange).mockRejectedValue(new Error('DB error'));

      const response = await DELETE(
        makeRequest('http://localhost/api/entity-changes/5', { method: 'DELETE' }),
        mockParams('5'),
      );
      expect(response.status).toBe(500);
    });
  });

  describe('PATCH', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      vi.mocked(enforceRouteAuth).mockResolvedValue(NextResponse.json({ message: 'Forbidden' }, { status: 403 } as never) as never);

      const response = await PATCH(
        makeRequest('http://localhost/api/entity-changes/5', { method: 'PATCH', body: JSON.stringify({ changeYear: 2001 }) }),
        mockParams('5'),
      );
      expect(response.status).toBe(403);
    });

    it('returns 400 for invalid id', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await PATCH(
        makeRequest('http://localhost/api/entity-changes/abc', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ changeYear: 2001 }),
        }),
        mockParams('abc'),
      );
      expect(response.status).toBe(400);
    });

    it('returns 400 for invalid body', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await PATCH(
        makeRequest('http://localhost/api/entity-changes/5', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ changeYear: 'two thousand' }),
        }),
        mockParams('5'),
      );
      expect(response.status).toBe(400);
    });

    it('returns updated change on success', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const updated = { entityChangeId: 5, changeYear: 2001, changeMonth: null, changeDay: null };
      vi.mocked(updateEntityChange).mockResolvedValue(updated as never);

      const response = await PATCH(
        makeRequest('http://localhost/api/entity-changes/5', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ changeYear: 2001 }),
        }),
        mockParams('5'),
      );
      expect(response.status).toBe(200);
      expect(updateEntityChange).toHaveBeenCalledWith(5, 1, { changeYear: 2001, changeMonth: null, changeDay: null, comment: null });
      const body = await response.json();
      expect(body).toEqual(updated);
    });

    it('updates comment when provided', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const updated = { entityChangeId: 5, changeYear: 2001, changeMonth: null, changeDay: null, comment: 'Merged' };
      vi.mocked(updateEntityChange).mockResolvedValue(updated as never);

      const response = await PATCH(
        makeRequest('http://localhost/api/entity-changes/5', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ changeYear: 2001, comment: 'Merged' }),
        }),
        mockParams('5'),
      );
      expect(response.status).toBe(200);
      expect(updateEntityChange).toHaveBeenCalledWith(5, 1, { changeYear: 2001, changeMonth: null, changeDay: null, comment: 'Merged' });
    });

    it('returns 500 on service error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(updateEntityChange).mockRejectedValue(new Error('DB error'));

      const response = await PATCH(
        makeRequest('http://localhost/api/entity-changes/5', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ changeYear: 2001 }),
        }),
        mockParams('5'),
      );
      expect(response.status).toBe(500);
    });
  });
});
