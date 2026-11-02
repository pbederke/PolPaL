import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/server/route-auth.server', () => ({ enforceRouteAuth: vi.fn() }));
vi.mock('@/modules/users/users.service', () => ({ getValidatedLinksByUser: vi.fn(), countValidatedLinksByUser: vi.fn() }));
vi.mock('@/lib/server/logger.server', () => ({ default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

import { GET } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getValidatedLinksByUser, countValidatedLinksByUser } from '@/modules/users/users.service';

function makeGet(url: string) {
  return new NextRequest(url);
}
function p(userId: string) {
  return { params: Promise.resolve({ userId }) as Promise<{ userId: string }> };
}

const AUTH = { userId: 1, username: 'alice', role: 'USER', approvedByAdmin: true } as never;

describe('/api/users/[userId]/validated-links route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 403 when auth fails', async () => {
      const { NextResponse } = await import('next/server');
      vi.mocked(enforceRouteAuth).mockResolvedValue(NextResponse.json({ message: 'Forbidden' }, { status: 403 } as never) as never);
      const response = await GET(makeGet('http://localhost/api/users/1/validated-links'), p('1'));
      expect(response.status).toBe(403);
    });

    it('returns 400 for invalid userId', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(AUTH);
      const response = await GET(makeGet('http://localhost/api/users/abc/validated-links'), p('abc'));
      expect(response.status).toBe(400);
    });

    it('returns 403 when accessing another user validated links', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(AUTH);
      const response = await GET(makeGet('http://localhost/api/users/2/validated-links'), p('2'));
      expect(response.status).toBe(403);
    });

    it('returns validated links array without limit', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(AUTH);
      vi.mocked(getValidatedLinksByUser).mockResolvedValue([{ validationId: 1, validated: 'APPROVED' }] as never);
      const response = await GET(makeGet('http://localhost/api/users/1/validated-links'), p('1'));
      expect(response.status).toBe(200);
      expect(getValidatedLinksByUser).toHaveBeenCalledWith(1, undefined);
    });

    it('returns paginated result with limit param', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(AUTH);
      vi.mocked(getValidatedLinksByUser).mockResolvedValue([{ validationId: 1 }] as never);
      vi.mocked(countValidatedLinksByUser).mockResolvedValue(8 as never);
      const response = await GET(makeGet('http://localhost/api/users/1/validated-links?limit=5'), p('1'));
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.items).toBeDefined();
      expect(body.total).toBe(8);
    });

    it('returns 400 for invalid limit param', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(AUTH);
      const response = await GET(makeGet('http://localhost/api/users/1/validated-links?limit=abc'), p('1'));
      expect(response.status).toBe(400);
    });

    it('returns 500 on service error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(AUTH);
      vi.mocked(getValidatedLinksByUser).mockRejectedValue(new Error('DB error'));
      const response = await GET(makeGet('http://localhost/api/users/1/validated-links'), p('1'));
      expect(response.status).toBe(500);
    });
  });
});
