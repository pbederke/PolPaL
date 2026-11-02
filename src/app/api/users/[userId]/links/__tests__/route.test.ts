import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/server/route-auth.server', () => ({ enforceRouteAuth: vi.fn() }));
vi.mock('@/modules/users/users.service', () => ({ getLinksByUser: vi.fn(), countLinksByUser: vi.fn() }));
vi.mock('@/lib/server/logger.server', () => ({ default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

import { GET } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getLinksByUser, countLinksByUser } from '@/modules/users/users.service';

function makeGet(url: string) {
  return new NextRequest(url);
}
function params(userId: string) {
  return { params: Promise.resolve({ userId }) as Promise<{ userId: string }> };
}

const AUTH = { userId: 1, username: 'alice', role: 'USER', approvedByAdmin: true } as never;

describe('/api/users/[userId]/links route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 403 when auth fails', async () => {
      const { NextResponse } = await import('next/server');
      vi.mocked(enforceRouteAuth).mockResolvedValue(NextResponse.json({ message: 'Forbidden' }, { status: 403 } as never) as never);
      const response = await GET(makeGet('http://localhost/api/users/1/links'), params('1'));
      expect(response.status).toBe(403);
    });

    it('returns 400 for invalid userId', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(AUTH);
      const response = await GET(makeGet('http://localhost/api/users/abc/links'), params('abc'));
      expect(response.status).toBe(400);
    });

    it('returns 403 when accessing another user links', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(AUTH);
      const response = await GET(makeGet('http://localhost/api/users/2/links'), params('2'));
      expect(response.status).toBe(403);
    });

    it('returns links array without limit', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(AUTH);
      const links = [{ linkEntriesToEntityId: 1 }];
      vi.mocked(getLinksByUser).mockResolvedValue(links as never);
      const response = await GET(makeGet('http://localhost/api/users/1/links'), params('1'));
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual(links);
      expect(getLinksByUser).toHaveBeenCalledWith(1, undefined);
    });

    it('returns paginated result with limit param', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(AUTH);
      vi.mocked(getLinksByUser).mockResolvedValue([{ linkEntriesToEntityId: 1 }] as never);
      vi.mocked(countLinksByUser).mockResolvedValue(10 as never);
      const response = await GET(makeGet('http://localhost/api/users/1/links?limit=5'), params('1'));
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.items).toBeDefined();
      expect(body.total).toBe(10);
    });

    it('returns 400 for invalid limit param', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(AUTH);
      const response = await GET(makeGet('http://localhost/api/users/1/links?limit=abc'), params('1'));
      expect(response.status).toBe(400);
    });

    it('returns 500 on service error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(AUTH);
      vi.mocked(getLinksByUser).mockRejectedValue(new Error('DB error'));
      const response = await GET(makeGet('http://localhost/api/users/1/links'), params('1'));
      expect(response.status).toBe(500);
    });
  });
});
