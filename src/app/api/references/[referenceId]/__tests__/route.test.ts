import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/references/references.service', () => ({
  deleteReference: vi.fn(),
  updateReference: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { DELETE, PATCH } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { deleteReference, updateReference } from '@/modules/references/references.service';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

function mockParams(referenceId: string) {
  return { params: Promise.resolve({ referenceId }) as Promise<{ referenceId: string }> };
}

function makeRequest(url: string, init?: RequestInit) {
  return new Request(url, init) as never;
}

describe('/api/references/[referenceId] route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('PATCH', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      vi.mocked(enforceRouteAuth).mockResolvedValue(NextResponse.json({ message: 'Forbidden' }, { status: 403 } as never) as never,
      );

      const response = await PATCH(
        makeRequest('http://localhost/api/references/5', { method: 'PATCH' }),
        mockParams('5'),
      );
      expect(response.status).toBe(403);
    });

    it('returns 400 for non-numeric id', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await PATCH(
        makeRequest('http://localhost/api/references/abc', { method: 'PATCH' }),
        mockParams('abc'),
      );
      expect(response.status).toBe(400);
    });

    it('returns 400 for invalid body', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await PATCH(
        makeRequest('http://localhost/api/references/5', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ value: '' }),
        }),
        mockParams('5'),
      );
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Invalid request body');
      expect(updateReference).not.toHaveBeenCalled();
    });

    it('returns 200 and updates on success', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const updated = { referenceId: 5, value: 'new value', type: 'SOURCE' };
      vi.mocked(updateReference).mockResolvedValue(updated as never);

      const response = await PATCH(
        makeRequest('http://localhost/api/references/5', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ value: 'new value' }),
        }),
        mockParams('5'),
      );
      expect(response.status).toBe(200);
      expect(updateReference).toHaveBeenCalledWith(5, expect.objectContaining({ value: 'new value' }), 1);
      const body = await response.json();
      expect(body).toHaveProperty('value', 'new value');
    });

    it('returns 404 when Reference not found', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(updateReference).mockRejectedValue(new Error('Reference not found'));

      const response = await PATCH(
        makeRequest('http://localhost/api/references/999', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ value: 'new value' }),
        }),
        mockParams('999'),
      );
      expect(response.status).toBe(404);
    });

    it('returns 500 on unexpected error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(updateReference).mockRejectedValue(new Error('DB error'));

      const response = await PATCH(
        makeRequest('http://localhost/api/references/5', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ value: 'new value' }),
        }),
        mockParams('5'),
      );
      expect(response.status).toBe(500);
    });
  });

  describe('DELETE', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      vi.mocked(enforceRouteAuth).mockResolvedValue(NextResponse.json({ message: 'Forbidden' }, { status: 403 } as never) as never,
      );

      const response = await DELETE(
        makeRequest('http://localhost/api/references/5', { method: 'DELETE' }),
        mockParams('5'),
      );
      expect(response.status).toBe(403);
    });

    it('returns 400 for non-numeric id', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await DELETE(
        makeRequest('http://localhost/api/references/abc', { method: 'DELETE' }),
        mockParams('abc'),
      );
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Invalid referenceId');
    });

    it('returns 400 for zero id', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await DELETE(
        makeRequest('http://localhost/api/references/0', { method: 'DELETE' }),
        mockParams('0'),
      );
      expect(response.status).toBe(400);
    });

    it('returns 400 for negative id', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await DELETE(
        makeRequest('http://localhost/api/references/-1', { method: 'DELETE' }),
        mockParams('-1'),
      );
      expect(response.status).toBe(400);
    });

    it('returns 204 on success without body', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteReference).mockResolvedValue(undefined as never);

      const response = await DELETE(
        makeRequest('http://localhost/api/references/5', { method: 'DELETE' }),
        mockParams('5'),
      );
      expect(response.status).toBe(204);
      expect(deleteReference).toHaveBeenCalledWith(5, 1, undefined);
    });

    it('returns 204 on success with comment', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteReference).mockResolvedValue(undefined as never);

      const response = await DELETE(
        makeRequest('http://localhost/api/references/5', {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ comment: 'Outdated reference' }),
        }),
        mockParams('5'),
      );
      expect(response.status).toBe(204);
      expect(deleteReference).toHaveBeenCalledWith(5, 1, 'Outdated reference');
    });

    it('returns 404 when Reference not found', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteReference).mockRejectedValue(new Error('Reference not found'));

      const response = await DELETE(
        makeRequest('http://localhost/api/references/999', { method: 'DELETE' }),
        mockParams('999'),
      );
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Reference not found');
    });

    it('returns 500 on unexpected error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteReference).mockRejectedValue(new Error('DB error'));

      const response = await DELETE(
        makeRequest('http://localhost/api/references/5', { method: 'DELETE' }),
        mockParams('5'),
      );
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Internal server error');
    });
  });
});
