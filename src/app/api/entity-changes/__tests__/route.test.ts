import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/entity-changes/entity-changes.service', () => ({
  createEntityChange: vi.fn(),
}));
vi.mock('@/modules/entity-changes/entity-changes.schema', async () => {
  const z = await import('zod');
  return {
    EntityChangeCreateSchema: z.default.object({
      entityId: z.number(),
      polpalId: z.number(),
      changeYear: z.number(),
      changeMonth: z.number().nullable().optional(),
      changeDay: z.number().nullable().optional(),
      comment: z.string().nullable().optional(),
    }),
  };
});
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { POST } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { createEntityChange } from '@/modules/entity-changes/entity-changes.service';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(url, init) as never;
}

describe('/api/entity-changes route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('POST', () => {
    const validBody = { entityId: 1, polpalId: 100, changeYear: 2024 };

    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      vi.mocked(enforceRouteAuth).mockResolvedValue(NextResponse.json({ message: 'Forbidden' }, { status: 403 } as never) as never,
      );

      const response = await POST(
        makeRequest('http://localhost/api/entity-changes', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(validBody),
        }),
      );
      expect(response.status).toBe(403);
    });

    it('returns 400 on invalid body', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await POST(
        makeRequest('http://localhost/api/entity-changes', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ entityId: 'not a number' }),
        }),
      );
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Invalid request body');
    });

    it('returns 201 on success with optional fields', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const created = { id: 10, ...validBody, changeMonth: null, changeDay: null, comment: null };
      vi.mocked(createEntityChange).mockResolvedValue(created as never);

      const response = await POST(
        makeRequest('http://localhost/api/entity-changes', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(validBody),
        }),
      );
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body).toEqual(created);
      expect(createEntityChange).toHaveBeenCalledWith(1, {
        ...validBody,
        changeMonth: null,
        changeDay: null,
        comment: null,
      });
    });

    it('returns 201 on success with all optional fields', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const fullBody = { ...validBody, changeMonth: 6, changeDay: 15, comment: 'Test change' };
      const created = { id: 11, ...fullBody };
      vi.mocked(createEntityChange).mockResolvedValue(created as never);

      const response = await POST(
        makeRequest('http://localhost/api/entity-changes', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(fullBody),
        }),
      );
      expect(response.status).toBe(201);
      expect(createEntityChange).toHaveBeenCalledWith(1, fullBody);
    });

    it('returns 500 on service error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(createEntityChange).mockRejectedValue(new Error('DB error'));

      const response = await POST(
        makeRequest('http://localhost/api/entity-changes', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(validBody),
        }),
      );
      expect(response.status).toBe(500);
    });
  });
});
