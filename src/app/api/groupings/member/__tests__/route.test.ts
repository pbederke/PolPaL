import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/groupings/groupings.service', () => ({
  createGroupingMember: vi.fn(),
}));
vi.mock('@/modules/groupings/groupings.schema', async () => {
  const z = await import('zod');
  return {
    GroupingMemberCreateSchema: z.default.object({
      entityId: z.default.number().int(),
      groupingId: z.default.number().int(),
      startYear: z.default.number().int(),
      startMonth: z.default.number().int().optional().nullable(),
      startDay: z.default.number().int().optional().nullable(),
      endYear: z.default.number().int().optional().nullable(),
      endMonth: z.default.number().int().optional().nullable(),
      endDay: z.default.number().int().optional().nullable(),
      comment: z.default.string().optional().nullable(),
    }),
  };
});
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { POST } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { createGroupingMember } from '@/modules/groupings/groupings.service';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

describe('/api/groupings/member route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('POST', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      const forbiddenResponse = NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      vi.mocked(enforceRouteAuth).mockResolvedValue(forbiddenResponse as never);

      const request = new Request('http://localhost/api/groupings/member', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it('returns 400 on invalid body', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const request = new Request('http://localhost/api/groupings/member', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ invalid: 'data' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Invalid request body');
    });

    it('returns 201 on success', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const created = { id: 1, entityId: 1, groupingId: 2, startYear: 2020 };
      vi.mocked(createGroupingMember).mockResolvedValue(created as never);

      const request = new Request('http://localhost/api/groupings/member', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ entityId: 1, groupingId: 2, startYear: 2020 }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body).toEqual(created);
    });

    it('returns 500 on service error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(createGroupingMember).mockRejectedValue(new Error('DB error'));

      const request = new Request('http://localhost/api/groupings/member', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ entityId: 1, groupingId: 2, startYear: 2020 }),
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
    });
  });
});
