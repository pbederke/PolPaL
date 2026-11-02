import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/admin/admin.service', () => ({
  updateUserAdmin: vi.fn(),
  deleteUserAdmin: vi.fn(),
}));
vi.mock('@/lib/shared/enums', () => ({
  RoleEnum: { ADMIN: 'ADMIN', USER: 'USER' },
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { PATCH, DELETE } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { updateUserAdmin, deleteUserAdmin } from '@/modules/admin/admin.service';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

function mockParams(deleteUserId: string) {
  return { params: Promise.resolve({ deleteUserId }) as Promise<{ deleteUserId: string }> };
}

function makeRequest(url: string, init?: RequestInit) {
  return new Request(url, init) as never;
}

describe('/api/admin/users/[deleteUserId] route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('PATCH', () => {
    const updateBody = {
      username: 'alice',
      nameFirst: 'Alice',
      nameLast: 'Smith',
      email: 'alice@example.com',
      role: 'USER',
      approvedByAdmin: true,
      emailVerified: true,
    };

    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      vi.mocked(enforceRouteAuth).mockResolvedValue(NextResponse.json({ message: 'Forbidden' }, { status: 403 } as never) as never,
      );

      const response = await PATCH(
        makeRequest('http://localhost/api/admin/users/5', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(updateBody),
        }),
        mockParams('5'),
      );
      expect(response.status).toBe(403);
    });

    it('returns 400 for invalid ID (non-numeric)', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await PATCH(
        makeRequest('http://localhost/api/admin/users/abc', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(updateBody),
        }),
        mockParams('abc'),
      );
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Invalid user ID');
    });

    it('returns 400 for invalid ID (zero)', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await PATCH(
        makeRequest('http://localhost/api/admin/users/0', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(updateBody),
        }),
        mockParams('0'),
      );
      expect(response.status).toBe(400);
    });

    it('returns 400 for invalid ID (negative)', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await PATCH(
        makeRequest('http://localhost/api/admin/users/-1', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(updateBody),
        }),
        mockParams('-1'),
      );
      expect(response.status).toBe(400);
    });

    it('returns 400 on malformed JSON', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await PATCH(
        makeRequest('http://localhost/api/admin/users/5', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: 'not json',
        }),
        mockParams('5'),
      );
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Invalid request body');
    });

    it('returns 422 on invalid input', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await PATCH(
        makeRequest('http://localhost/api/admin/users/5', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ username: '' }),
        }),
        mockParams('5'),
      );
      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Invalid input');
    });

    it('returns 200 on success', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const updated = { id: 5, ...updateBody };
      vi.mocked(updateUserAdmin).mockResolvedValue(updated as never);

      const response = await PATCH(
        makeRequest('http://localhost/api/admin/users/5', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(updateBody),
        }),
        mockParams('5'),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(updated);
      expect(updateUserAdmin).toHaveBeenCalledWith(5, expect.objectContaining({ username: 'alice' }));
    });

    it('returns 409 on CONFLICT_USERNAME', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const err = Object.assign(new Error('conflict'), { code: 'CONFLICT_USERNAME' });
      vi.mocked(updateUserAdmin).mockRejectedValue(err);

      const response = await PATCH(
        makeRequest('http://localhost/api/admin/users/5', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(updateBody),
        }),
        mockParams('5'),
      );
      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Username is already taken.');
    });

    it('returns 409 on CONFLICT_EMAIL', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const err = Object.assign(new Error('conflict'), { code: 'CONFLICT_EMAIL' });
      vi.mocked(updateUserAdmin).mockRejectedValue(err);

      const response = await PATCH(
        makeRequest('http://localhost/api/admin/users/5', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(updateBody),
        }),
        mockParams('5'),
      );
      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Email is already in use.');
    });

    it('returns 500 on unexpected error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(updateUserAdmin).mockRejectedValue(new Error('unexpected'));

      const response = await PATCH(
        makeRequest('http://localhost/api/admin/users/5', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(updateBody),
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
        makeRequest('http://localhost/api/admin/users/5', { method: 'DELETE' }),
        mockParams('5'),
      );
      expect(response.status).toBe(403);
    });

    it('returns 400 for invalid ID (non-numeric)', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await DELETE(
        makeRequest('http://localhost/api/admin/users/abc', { method: 'DELETE' }),
        mockParams('abc'),
      );
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Invalid user ID');
    });

    it('returns 400 for invalid ID (zero)', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await DELETE(
        makeRequest('http://localhost/api/admin/users/0', { method: 'DELETE' }),
        mockParams('0'),
      );
      expect(response.status).toBe(400);
    });

    it('returns 204 on success', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteUserAdmin).mockResolvedValue(undefined as never);

      const response = await DELETE(
        makeRequest('http://localhost/api/admin/users/5', { method: 'DELETE' }),
        mockParams('5'),
      );
      expect(response.status).toBe(204);
      expect(deleteUserAdmin).toHaveBeenCalledWith(5);
    });

    it('returns 404 on P2025 (not found)', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const err = Object.assign(new Error('not found'), { code: 'P2025' });
      vi.mocked(deleteUserAdmin).mockRejectedValue(err);

      const response = await DELETE(
        makeRequest('http://localhost/api/admin/users/999', { method: 'DELETE' }),
        mockParams('999'),
      );
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'User not found');
    });

    it('returns 500 on unexpected error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteUserAdmin).mockRejectedValue(new Error('unexpected'));

      const response = await DELETE(
        makeRequest('http://localhost/api/admin/users/5', { method: 'DELETE' }),
        mockParams('5'),
      );
      expect(response.status).toBe(500);
    });
  });
});
