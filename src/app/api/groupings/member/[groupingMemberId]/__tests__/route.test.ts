import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/groupings/groupings.service', () => ({
  deleteGroupingMember: vi.fn(),
  updateGroupingMember: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { DELETE, PATCH } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { deleteGroupingMember, updateGroupingMember } from '@/modules/groupings/groupings.service';

describe('/api/groupings/member/[groupingMemberId] route', () => {
  beforeEach(() => vi.clearAllMocks());

  const paramsFor = (groupingMemberId: string) => ({
    params: Promise.resolve({ groupingMemberId }) as Promise<{ groupingMemberId: string }>,
  });

  describe('DELETE', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      vi.mocked(enforceRouteAuth).mockResolvedValue(NextResponse.json({ message: 'Forbidden' }, { status: 403 } as never) as never);

      const response = await DELETE(new Request('http://localhost', { method: 'DELETE' }), paramsFor('1'));

      expect(response.status).toBe(403);
    });

    it('returns 204 on success', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);
      vi.mocked(deleteGroupingMember).mockResolvedValue(undefined as never);

      const response = await DELETE(new Request('http://localhost', { method: 'DELETE' }), paramsFor('1'));

      expect(response.status).toBe(204);
    });

    it('returns 500 on error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);
      vi.mocked(deleteGroupingMember).mockRejectedValue(new Error('DB error'));

      const response = await DELETE(new Request('http://localhost', { method: 'DELETE' }), paramsFor('1'));

      expect(response.status).toBe(500);
    });
  });

  describe('PATCH', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      vi.mocked(enforceRouteAuth).mockResolvedValue(NextResponse.json({ message: 'Forbidden' }, { status: 403 } as never) as never);

      const response = await PATCH(new Request('http://localhost', { method: 'PATCH' }), paramsFor('1'));

      expect(response.status).toBe(403);
    });

    it('returns 400 for invalid id', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);

      const response = await PATCH(
        new Request('http://localhost', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ endYear: 2010 }),
        }),
        paramsFor('abc'),
      );

      expect(response.status).toBe(400);
    });

    it('returns 400 for invalid body', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);

      const response = await PATCH(
        new Request('http://localhost', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ endYear: 'two thousand' }),
        }),
        paramsFor('1'),
      );

      expect(response.status).toBe(400);
    });

    it('returns updated member on success', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);
      const updated = { groupingMemberId: 1, startYear: 2001, endYear: 2010 };
      vi.mocked(updateGroupingMember).mockResolvedValue(updated as never);

      const response = await PATCH(
        new Request('http://localhost', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ startYear: 2001, endYear: 2010 }),
        }),
        paramsFor('1'),
      );

      expect(response.status).toBe(200);
      expect(updateGroupingMember).toHaveBeenCalledWith(1, 1, {
        startYear: 2001, startMonth: null, startDay: null,
        endYear: 2010, endMonth: null, endDay: null,
      });
      const body = await response.json();
      expect(body).toEqual(updated);
    });

    it('updates comment when provided', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);
      const updated = { groupingMemberId: 1, startYear: 2001, endYear: 2010, comment: 'Left party' };
      vi.mocked(updateGroupingMember).mockResolvedValue(updated as never);

      const response = await PATCH(
        new Request('http://localhost', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ startYear: 2001, endYear: 2010, comment: 'Left party' }),
        }),
        paramsFor('1'),
      );

      expect(response.status).toBe(200);
      expect(updateGroupingMember).toHaveBeenCalledWith(1, 1, {
        startYear: 2001, startMonth: null, startDay: null,
        endYear: 2010, endMonth: null, endDay: null,
        comment: 'Left party',
      });
    });

    it('returns 500 on error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);
      vi.mocked(updateGroupingMember).mockRejectedValue(new Error('DB error'));

      const response = await PATCH(
        new Request('http://localhost', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ endYear: 2010 }),
        }),
        paramsFor('1'),
      );

      expect(response.status).toBe(500);
    });
  });
});
