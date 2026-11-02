import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/entity-names/entity-names.service', () => ({
  createEntityName: vi.fn(),
}));
vi.mock('@/modules/entity-names/entity-names.schema', async () => {
  const z = await import('zod');
  return {
    EntityNameCreateSchema: z.default.object({
      entityId: z.number(),
      polpalId: z.number(),
      entityName: z.string(),
    }),
  };
});
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { POST } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { createEntityName } from '@/modules/entity-names/entity-names.service';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(url, init) as never;
}

describe('/api/entity-names route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('POST', () => {
    const validBody = { entityId: 1, polpalId: 100, entityName: 'Rome' };

    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      vi.mocked(enforceRouteAuth).mockResolvedValue(NextResponse.json({ message: 'Forbidden' }, { status: 403 } as never) as never,
      );

      const response = await POST(
        makeRequest('http://localhost/api/entity-names', {
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
        makeRequest('http://localhost/api/entity-names', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ entityId: 'not a number' }),
        }),
      );
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Invalid request body');
    });

    it('returns 201 on success', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const created = { id: 10, ...validBody };
      vi.mocked(createEntityName).mockResolvedValue(created as never);

      const response = await POST(
        makeRequest('http://localhost/api/entity-names', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(validBody),
        }),
      );
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body).toEqual(created);
      expect(createEntityName).toHaveBeenCalledWith(1, validBody);
    });

    it('returns 500 on service error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(createEntityName).mockRejectedValue(new Error('DB error'));

      const response = await POST(
        makeRequest('http://localhost/api/entity-names', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(validBody),
        }),
      );
      expect(response.status).toBe(500);
    });
  });
});
