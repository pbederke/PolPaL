import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/entries/entries.service', () => ({
  syncEntries: vi.fn(),
}));
vi.mock('@/modules/entries/entries.schema', () => ({
  syncEntriesBodySchema: { safeParse: vi.fn() },
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { POST } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { syncEntries } from '@/modules/entries/entries.service';
import { syncEntriesBodySchema } from '@/modules/entries/entries.schema';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/entries/sync', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const VALID_SYNC_BODY = {
  toCreate: [{ title: 'New Entry' }],
  toUpdate: [{ id: 1, title: 'Updated' }],
  toDelete: [2],
};

describe('/api/entries/sync route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('POST', () => {
    it('returns 403 when auth fails', async () => {
      const { NextResponse } = await import('next/server');
      vi.mocked(enforceRouteAuth).mockResolvedValue(
        NextResponse.json({ message: 'Forbidden' }, { status: 403 } as never) as never,
      );

      const response = await POST(makeRequest(VALID_SYNC_BODY));
      expect(response.status).toBe(403);
    });

    it('returns 400 when validation fails', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(syncEntriesBodySchema.safeParse).mockReturnValue({
        success: false,
        error: {
          issues: [{ code: 'invalid_type', path: ['toCreate'], message: 'Required' }],
        },
      } as never);

      const response = await POST(makeRequest({ invalid: true }));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toHaveProperty('message', 'Invalid request body');
      expect(body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: ['toCreate'] })]),
      );
    });

    it('returns 200 with sync results on success', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(syncEntriesBodySchema.safeParse).mockReturnValue({
        success: true,
        data: VALID_SYNC_BODY,
      } as never);
      vi.mocked(syncEntries).mockResolvedValue({
        created: 1,
        updated: 1,
        deleted: 1,
      } as never);

      const response = await POST(makeRequest(VALID_SYNC_BODY));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({ created: 1, updated: 1, deleted: 1 });
      expect(syncEntries).toHaveBeenCalledWith(1, VALID_SYNC_BODY.toCreate, VALID_SYNC_BODY.toUpdate, VALID_SYNC_BODY.toDelete);
    });

    it('returns 200 with only creates', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const createOnly = { toCreate: [{ title: 'New' }], toUpdate: [], toDelete: [] };
      vi.mocked(syncEntriesBodySchema.safeParse).mockReturnValue({
        success: true,
        data: createOnly,
      } as never);
      vi.mocked(syncEntries).mockResolvedValue({ created: 1, updated: 0, deleted: 0 } as never);

      const response = await POST(makeRequest(createOnly));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.created).toBe(1);
      expect(body.updated).toBe(0);
      expect(body.deleted).toBe(0);
    });

    it('returns 200 with only deletes', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const deleteOnly = { toCreate: [], toUpdate: [], toDelete: [1, 2, 3] };
      vi.mocked(syncEntriesBodySchema.safeParse).mockReturnValue({
        success: true,
        data: deleteOnly,
      } as never);
      vi.mocked(syncEntries).mockResolvedValue({ created: 0, updated: 0, deleted: 3 } as never);

      const response = await POST(makeRequest(deleteOnly));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.deleted).toBe(3);
      expect(syncEntries).toHaveBeenCalledWith(1, [], [], [1, 2, 3]);
    });

    it('returns 500 on unexpected error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(syncEntriesBodySchema.safeParse).mockReturnValue({
        success: true,
        data: VALID_SYNC_BODY,
      } as never);
      vi.mocked(syncEntries).mockRejectedValue(new Error('DB error'));

      const response = await POST(makeRequest(VALID_SYNC_BODY));
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body).toHaveProperty('message', 'Internal server error');
    });
  });
});
