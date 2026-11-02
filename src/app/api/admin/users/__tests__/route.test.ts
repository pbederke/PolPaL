import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/admin/admin.service', () => ({
  getUsersAdmin: vi.fn(),
  createUserAdmin: vi.fn(),
}));
vi.mock('@/lib/shared/enums', () => ({
  RoleEnum: { ADMIN: 'ADMIN', USER: 'USER' },
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { GET, POST } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getUsersAdmin, createUserAdmin } from '@/modules/admin/admin.service';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(url, init) as never;
}

describe('/api/admin/users route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      vi.mocked(enforceRouteAuth).mockResolvedValue(NextResponse.json({ message: 'Forbidden' }, { status: 403 } as never) as never,
      );

      const response = await GET(makeRequest('http://localhost/api/admin/users'));
      expect(response.status).toBe(403);
    });

    it('returns 200 with paginated data (default page)', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const items = [{ id: 1, username: 'alice' }];
      vi.mocked(getUsersAdmin).mockResolvedValue({ items, total: 1 } as never);

      const response = await GET(makeRequest('http://localhost/api/admin/users'));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.items).toEqual(items);
      expect(body.total).toBe(1);
      expect(body.page).toBe(1);
      expect(body.pageCount).toBe(1);
      expect(getUsersAdmin).toHaveBeenCalledWith(0, 1000);
    });

    it('parses page from search params', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(getUsersAdmin).mockResolvedValue({ items: [], total: 2500 } as never);

      const response = await GET(makeRequest('http://localhost/api/admin/users?page=3'));
      const body = await response.json();

      expect(body.page).toBe(3);
      expect(getUsersAdmin).toHaveBeenCalledWith(2000, 1000);
    });

    it('clamps page to 1 for non-positive values', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(getUsersAdmin).mockResolvedValue({ items: [], total: 0 } as never);

      await GET(makeRequest('http://localhost/api/admin/users?page=0'));
      expect(getUsersAdmin).toHaveBeenCalledWith(0, 1000);

      await GET(makeRequest('http://localhost/api/admin/users?page=-5'));
      expect(getUsersAdmin).toHaveBeenCalledWith(0, 1000);
    });

    it('calculates pageCount correctly', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(getUsersAdmin).mockResolvedValue({ items: [], total: 2500 } as never);

      const response = await GET(makeRequest('http://localhost/api/admin/users'));
      const body = await response.json();

      expect(body.pageCount).toBe(3);
    });

    it('returns 500 on service error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(getUsersAdmin).mockRejectedValue(new Error('DB error'));

      const response = await GET(makeRequest('http://localhost/api/admin/users'));
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Internal server error');
    });
  });

  describe('POST', () => {
    const validBody = {
      username: 'alice',
      nameFirst: 'Alice',
      nameLast: 'Smith',
      email: 'alice@example.com',
      password: 'Str0ngPass',
      role: 'USER',
      approvedByAdmin: false,
      emailVerified: false,
    };

    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      vi.mocked(enforceRouteAuth).mockResolvedValue(NextResponse.json({ message: 'Forbidden' }, { status: 403 } as never) as never,
      );

      const response = await POST(
        makeRequest('http://localhost/api/admin/users', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(validBody),
        }),
      );
      expect(response.status).toBe(403);
    });

    it('returns 400 on malformed JSON', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await POST(
        makeRequest('http://localhost/api/admin/users', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: 'not json',
        }),
      );
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Invalid request body');
    });

    it('returns 422 on invalid input', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await POST(
        makeRequest('http://localhost/api/admin/users', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ username: '' }),
        }),
      );
      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Invalid input');
      expect(body).toHaveProperty('errors');
    });

    it('returns 422 for weak password', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await POST(
        makeRequest('http://localhost/api/admin/users', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ...validBody, password: 'weak' }),
        }),
      );
      expect(response.status).toBe(422);
    });

    it('returns 201 on success', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const created = { id: 10, ...validBody, password: undefined };
      vi.mocked(createUserAdmin).mockResolvedValue(created as never);

      const response = await POST(
        makeRequest('http://localhost/api/admin/users', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(validBody),
        }),
      );
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body).toEqual(created);
      expect(createUserAdmin).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'alice', email: 'alice@example.com' }),
      );
    });

    it('returns 409 on CONFLICT_USERNAME', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const err = Object.assign(new Error('conflict'), { code: 'CONFLICT_USERNAME' });
      vi.mocked(createUserAdmin).mockRejectedValue(err);

      const response = await POST(
        makeRequest('http://localhost/api/admin/users', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(validBody),
        }),
      );
      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Username is already taken.');
    });

    it('returns 409 on CONFLICT_EMAIL', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const err = Object.assign(new Error('conflict'), { code: 'CONFLICT_EMAIL' });
      vi.mocked(createUserAdmin).mockRejectedValue(err);

      const response = await POST(
        makeRequest('http://localhost/api/admin/users', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(validBody),
        }),
      );
      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Email is already in use.');
    });

    it('returns 500 on unexpected error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(createUserAdmin).mockRejectedValue(new Error('unexpected'));

      const response = await POST(
        makeRequest('http://localhost/api/admin/users', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(validBody),
        }),
      );
      expect(response.status).toBe(500);
    });
  });
});
