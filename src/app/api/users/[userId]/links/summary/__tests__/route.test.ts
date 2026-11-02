import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/server/route-auth.server', () => ({ enforceRouteAuth: vi.fn() }));
vi.mock('@/modules/users/users.service', () => ({ getLinksSummaryByUser: vi.fn() }));
vi.mock('@/lib/server/logger.server', () => ({ default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

import { GET } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getLinksSummaryByUser } from '@/modules/users/users.service';

function makeGet() {
  return new NextRequest('http://localhost/api/users/1/links/summary');
}
function p(userId: string) {
  return { params: Promise.resolve({ userId }) as Promise<{ userId: string }> };
}

const AUTH = { userId: 1, username: 'alice', role: 'USER', approvedByAdmin: true } as never;

describe('/api/users/[userId]/links/summary route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 403 when auth fails', async () => {
      const { NextResponse } = await import('next/server');
      vi.mocked(enforceRouteAuth).mockResolvedValue(NextResponse.json({ message: 'Forbidden' }, { status: 403 } as never) as never);
      const response = await GET(makeGet(), p('1'));
      expect(response.status).toBe(403);
    });

    it('returns 400 for invalid userId', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(AUTH);
      const response = await GET(makeGet(), p('abc'));
      expect(response.status).toBe(400);
    });

    it('returns 403 when accessing another user summary', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(AUTH);
      const response = await GET(new NextRequest('http://localhost/api/users/2/links/summary'), p('2'));
      expect(response.status).toBe(403);
    });

    it('returns 200 with summary data', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(AUTH);
      vi.mocked(getLinksSummaryByUser).mockResolvedValue([{ projectKey: 'p1', versionKey: 'v1' }] as never);
      const response = await GET(makeGet(), p('1'));
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toHaveLength(1);
      expect(getLinksSummaryByUser).toHaveBeenCalledWith(1);
    });

    it('returns 500 on service error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(AUTH);
      vi.mocked(getLinksSummaryByUser).mockRejectedValue(new Error('DB error'));
      const response = await GET(makeGet(), p('1'));
      expect(response.status).toBe(500);
    });
  });
});
