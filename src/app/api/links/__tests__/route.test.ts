import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/links/links.service', () => ({
  createLink: vi.fn(),
}));
vi.mock('@/modules/links/links.schema', async () => {
  const z = await import('zod');
  return {
    LinkCreateSchema: z.default.object({
      uniqueObservationId: z.default.string().min(1),
      polpalId: z.default.number().int(),
      startYear: z.default.number().int().optional().nullable(),
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
import { createLink } from '@/modules/links/links.service';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

describe('/api/links route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('POST', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      const forbiddenResponse = NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      vi.mocked(enforceRouteAuth).mockResolvedValue(forbiddenResponse as never);

      const request = new Request('http://localhost/api/links', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it('returns 400 on invalid body', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const request = new Request('http://localhost/api/links', {
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
      const created = { id: 1, uniqueObservationId: 'obs1', polpalId: 1 };
      vi.mocked(createLink).mockResolvedValue(created as never);

      const request = new Request('http://localhost/api/links', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ uniqueObservationId: 'obs1', polpalId: 1 }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body).toEqual(created);
      expect(createLink).toHaveBeenCalledWith(
        expect.objectContaining({ uniqueObservationId: 'obs1', polpalId: 1 }),
        1,
      );
    });

    it('returns 500 on service error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(createLink).mockRejectedValue(new Error('DB error'));

      const request = new Request('http://localhost/api/links', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ uniqueObservationId: 'obs1', polpalId: 1 }),
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
    });
  });
});
