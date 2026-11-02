import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/lib/server/auth.server', () => ({
  getAuthPayload: vi.fn(),
}));
vi.mock('@/modules/entities/entities.service', () => ({
  getEntityByPolpalId: vi.fn(),
  deleteEntity: vi.fn(),
  updateEntity: vi.fn(),
}));
vi.mock('@/modules/entities/entities.schema', async () => {
  const z = await import('zod');
  return {
    EntityUpdateSchema: z.default.object({
      isHidden: z.default.boolean().optional(),
      isHiddenReason: z.default.string().optional().nullable(),
      nameShort: z.default.string().min(1).optional(),
      nameEnglish: z.default.string().min(1).optional(),
      name: z.default.string().optional().nullable(),
      entityType: z.default.string().min(1).optional(),
      partyfactsId: z.default.number().int().optional().nullable(),
      wikipediaUrl: z.default.string().optional().nullable(),
      wikidataId: z.default.string().optional().nullable(),
      comment: z.default.string().optional().nullable(),
    }),
  };
});
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/lib/shared/enums', () => ({
  RoleEnum: { ADMIN: 'ADMIN', USER: 'USER' },
}));

import { GET, DELETE, PUT } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getAuthPayload } from '@/lib/server/auth.server';
import { getEntityByPolpalId, deleteEntity, updateEntity } from '@/modules/entities/entities.service';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

const mockParams = (id: string) => ({
  params: Promise.resolve({ polpalId: id }) as Promise<{ polpalId: string }>,
});

describe('/api/entities/[polpalId] route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 200 with entity', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(null as never);
      const entity = { polpalId: 1, nameShort: 'Test Entity' };
      vi.mocked(getAuthPayload).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(getEntityByPolpalId).mockResolvedValue(entity as never);

      const response = await GET(
        new Request('http://localhost/api/entities/1'),
        mockParams('1'),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(entity);
      expect(getEntityByPolpalId).toHaveBeenCalledWith(1, true);
    });

    it('returns 400 for invalid ID (zero)', async () => {
      const response = await GET(
        new Request('http://localhost/api/entities/0'),
        mockParams('0'),
      );
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Invalid PolPaL ID');
    });

    it('returns 400 for invalid ID (negative)', async () => {
      const response = await GET(
        new Request('http://localhost/api/entities/-1'),
        mockParams('-1'),
      );
      expect(response.status).toBe(400);
    });

    it('returns 400 for non-integer ID', async () => {
      const response = await GET(
        new Request('http://localhost/api/entities/abc'),
        mockParams('abc'),
      );
      expect(response.status).toBe(400);
    });

    it('returns 404 when not found', async () => {
      vi.mocked(getAuthPayload).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(getEntityByPolpalId).mockResolvedValue(null);

      const response = await GET(
        new Request('http://localhost/api/entities/999'),
        mockParams('999'),
      );
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Entity not found');
    });

    it('returns 500 on error', async () => {
      vi.mocked(getAuthPayload).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(getEntityByPolpalId).mockRejectedValue(new Error('DB error'));

      const response = await GET(
        new Request('http://localhost/api/entities/1'),
        mockParams('1'),
      );
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Internal server error');
    });
  });

  describe('DELETE', () => {
    it('returns 500 when not authenticated (non-null assertion)', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(null);

      const response = await DELETE(
        new Request('http://localhost/api/entities/1', { method: 'DELETE' }),
        mockParams('1'),
      );
      expect(response.status).toBe(500);
    });

    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      const forbiddenResponse = NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      vi.mocked(enforceRouteAuth).mockResolvedValue(forbiddenResponse as never);

      const response = await DELETE(
        new Request('http://localhost/api/entities/1', { method: 'DELETE' }),
        mockParams('1'),
      );
      expect(response.status).toBe(403);
    });

    it('returns 204 on success', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteEntity).mockResolvedValue(undefined as never);

      const response = await DELETE(
        new Request('http://localhost/api/entities/1', { method: 'DELETE' }),
        mockParams('1'),
      );
      expect(response.status).toBe(204);
    });

    it('returns 400 for invalid ID (zero)', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await DELETE(
        new Request('http://localhost/api/entities/0', { method: 'DELETE' }),
        mockParams('0'),
      );
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Invalid PolPaL ID');
    });

    it('returns 500 on error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteEntity).mockRejectedValue(new Error('DB error'));

      const response = await DELETE(
        new Request('http://localhost/api/entities/1', { method: 'DELETE' }),
        mockParams('1'),
      );
      expect(response.status).toBe(500);
    });
  });

  describe('PUT', () => {
    it('returns 500 when not authenticated (non-null assertion)', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(null);

      const response = await PUT(
        new Request('http://localhost/api/entities/1', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({}),
        }),
        mockParams('1'),
      );
      expect(response.status).toBe(500);
    });

    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      const forbiddenResponse = NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      vi.mocked(enforceRouteAuth).mockResolvedValue(forbiddenResponse as never);

      const response = await PUT(
        new Request('http://localhost/api/entities/1', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({}),
        }),
        mockParams('1'),
      );
      expect(response.status).toBe(403);
    });

    it('returns 200 on success', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const updated = { polpalId: 1, nameShort: 'Updated' };
      vi.mocked(updateEntity).mockResolvedValue(updated as never);

      const response = await PUT(
        new Request('http://localhost/api/entities/1', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ nameShort: 'Updated' }),
        }),
        mockParams('1'),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(updated);
    });

    it('returns 400 on invalid body', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await PUT(
        new Request('http://localhost/api/entities/1', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ nameShort: 123 }),
        }),
        mockParams('1'),
      );
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Invalid request body');
    });

    it('returns 400 for invalid ID', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await PUT(
        new Request('http://localhost/api/entities/0', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ nameShort: 'Updated' }),
        }),
        mockParams('0'),
      );
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Invalid PolPaL ID');
    });
  });
});
