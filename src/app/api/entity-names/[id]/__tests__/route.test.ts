import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/entity-names/entity-names.service', () => ({
  getEntityNamesByPolpalId: vi.fn(),
  deleteEntityName: vi.fn(),
  updateEntityName: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { GET, DELETE, PATCH } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getEntityNamesByPolpalId, deleteEntityName, updateEntityName } from '@/modules/entity-names/entity-names.service';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

function mockParams(id: string) {
  return { params: Promise.resolve({ id }) as Promise<{ id: string }> };
}

function makeRequest(url: string, init?: RequestInit) {
  return new Request(url, init) as never;
}

describe('/api/entity-names/[id] route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 400 for non-numeric id', async () => {
      const response = await GET(
        makeRequest('http://localhost/api/entity-names/abc'),
        mockParams('abc'),
      );
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Invalid PolPaL ID');
    });

    it('returns 400 for zero id', async () => {
      const response = await GET(
        makeRequest('http://localhost/api/entity-names/0'),
        mockParams('0'),
      );
      expect(response.status).toBe(400);
    });

    it('returns 400 for negative id', async () => {
      const response = await GET(
        makeRequest('http://localhost/api/entity-names/-1'),
        mockParams('-1'),
      );
      expect(response.status).toBe(400);
    });

    it('returns 200 with data for valid id', async () => {
      const data = [{ id: 1, polpalId: 42, entityName: 'Rome' }];
      vi.mocked(getEntityNamesByPolpalId).mockResolvedValue(data as never);

      const response = await GET(
        makeRequest('http://localhost/api/entity-names/42'),
        mockParams('42'),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(data);
      expect(getEntityNamesByPolpalId).toHaveBeenCalledWith(42);
    });

    it('returns 500 on service error', async () => {
      vi.mocked(getEntityNamesByPolpalId).mockRejectedValue(new Error('DB error'));

      const response = await GET(
        makeRequest('http://localhost/api/entity-names/42'),
        mockParams('42'),
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
        makeRequest('http://localhost/api/entity-names/5', { method: 'DELETE' }),
        mockParams('5'),
      );
      expect(response.status).toBe(403);
    });

    it('returns 400 for non-numeric id', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await DELETE(
        makeRequest('http://localhost/api/entity-names/abc', { method: 'DELETE' }),
        mockParams('abc'),
      );
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Invalid entity name ID');
    });

    it('returns 400 for zero id', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await DELETE(
        makeRequest('http://localhost/api/entity-names/0', { method: 'DELETE' }),
        mockParams('0'),
      );
      expect(response.status).toBe(400);
    });

    it('returns 204 on success without body', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteEntityName).mockResolvedValue(undefined as never);

      const response = await DELETE(
        makeRequest('http://localhost/api/entity-names/5', { method: 'DELETE' }),
        mockParams('5'),
      );
      expect(response.status).toBe(204);
      expect(deleteEntityName).toHaveBeenCalledWith(5, 1, undefined);
    });

    it('returns 204 on success with comment', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteEntityName).mockResolvedValue(undefined as never);

      const response = await DELETE(
        makeRequest('http://localhost/api/entity-names/5', {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ comment: 'Duplicate name' }),
        }),
        mockParams('5'),
      );
      expect(response.status).toBe(204);
      expect(deleteEntityName).toHaveBeenCalledWith(5, 1, 'Duplicate name');
    });

    it('returns 500 on service error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteEntityName).mockRejectedValue(new Error('DB error'));

      const response = await DELETE(
        makeRequest('http://localhost/api/entity-names/5', { method: 'DELETE' }),
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
        makeRequest('http://localhost/api/entity-names/5', { method: 'PATCH', body: JSON.stringify({ endYear: 2010 }) }),
        mockParams('5'),
      );
      expect(response.status).toBe(403);
    });

    it('returns 400 for invalid id', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await PATCH(
        makeRequest('http://localhost/api/entity-names/abc', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ endYear: 2010 }),
        }),
        mockParams('abc'),
      );
      expect(response.status).toBe(400);
    });

    it('returns 400 for invalid body', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await PATCH(
        makeRequest('http://localhost/api/entity-names/5', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ endYear: 'two thousand' }),
        }),
        mockParams('5'),
      );
      expect(response.status).toBe(400);
    });

    it('returns updated name on success', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const updated = { entityNameId: 5, nameShort: 'SPD', name: 'SPD', language: 'de', startYear: 2001, endYear: 2010 };
      vi.mocked(updateEntityName).mockResolvedValue(updated as never);

      const response = await PATCH(
        makeRequest('http://localhost/api/entity-names/5', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ nameShort: 'SPD', name: 'SPD', language: 'de', startYear: 2001, endYear: 2010 }),
        }),
        mockParams('5'),
      );
      expect(response.status).toBe(200);
      expect(updateEntityName).toHaveBeenCalledWith(5, 1, {
        nameShort: 'SPD', name: 'SPD', language: 'de',
        startYear: 2001, endYear: 2010,
      });
      const body = await response.json();
      expect(body).toEqual(updated);
    });

    it('updates comment when provided', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const updated = { entityNameId: 5, nameShort: 'SPD', name: 'SPD', language: 'de', comment: 'Official name' };
      vi.mocked(updateEntityName).mockResolvedValue(updated as never);

      const response = await PATCH(
        makeRequest('http://localhost/api/entity-names/5', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ comment: 'Official name' }),
        }),
        mockParams('5'),
      );
      expect(response.status).toBe(200);
      expect(updateEntityName).toHaveBeenCalledWith(5, 1, { comment: 'Official name' });
    });

    it('returns 500 on service error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(updateEntityName).mockRejectedValue(new Error('DB error'));

      const response = await PATCH(
        makeRequest('http://localhost/api/entity-names/5', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: 'New name' }),
        }),
        mockParams('5'),
      );
      expect(response.status).toBe(500);
    });
  });
});
