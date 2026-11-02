import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/server/route-auth.server', () => ({ enforceRouteAuth: vi.fn() }));
vi.mock('@/modules/users/users.service', () => ({ getUserById: vi.fn() }));
vi.mock('@/lib/server/logger.server', () => ({ default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

import { GET } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getUserById } from '@/modules/users/users.service';

function makeRequest() {
  return new NextRequest('http://localhost/api/users/1');
}
function params(userId: string) {
  return { params: Promise.resolve({ userId }) as Promise<{ userId: string }> };
}

const AUTH = { userId: 1, username: 'alice', role: 'USER', approvedByAdmin: true } as never;

describe('/api/users/[userId] route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 403 when auth fails', async () => {
      const { NextResponse } = await import('next/server');
      vi.mocked(enforceRouteAuth).mockResolvedValue(NextResponse.json({ message: 'Forbidden' }, { status: 403 } as never) as never);
      const response = await GET(makeRequest(), params('1'));
      expect(response.status).toBe(403);
    });

    it('returns 400 for invalid userId', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(AUTH);
      const response = await GET(makeRequest(), params('abc'));
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe('Invalid user ID');
    });

    it('returns 403 when accessing another user data', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(AUTH);
      const response = await GET(makeRequest(), params('2'));
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.message).toContain('Forbidden');
    });

    it('returns 200 with user data', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(AUTH);
      const user = { userId: 1, nameFirst: 'Alice', nameLast: 'Smith', email: 'alice@test.com', username: 'alice', role: 'USER', approvedByAdmin: true, createdAt: new Date(), updatedAt: new Date() };
      vi.mocked(getUserById).mockResolvedValue(user as never);
      const response = await GET(makeRequest(), params('1'));
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.userId).toBe(1);
      expect(body.username).toBe('alice');
    });

    it('returns 404 when user not found', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(AUTH);
      vi.mocked(getUserById).mockResolvedValue(null);
      const response = await GET(makeRequest(), params('1'));
      expect(response.status).toBe(404);
    });

    it('returns 500 on service error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(AUTH);
      vi.mocked(getUserById).mockRejectedValue(new Error('DB error'));
      const response = await GET(makeRequest(), params('1'));
      expect(response.status).toBe(500);
    });
  });
});
