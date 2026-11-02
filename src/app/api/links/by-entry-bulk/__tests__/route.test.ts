import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/links/links.service', () => ({
  deleteLinkByEntryBulk: vi.fn(),
  createLinksBulk: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { DELETE, POST } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { deleteLinkByEntryBulk, createLinksBulk } from '@/modules/links/links.service';

describe('/api/links/by-entry-bulk', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('DELETE', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      vi.mocked(enforceRouteAuth).mockResolvedValue(NextResponse.json({ message: 'Forbidden' }, { status: 403 } as never) as never);

      const response = await DELETE(new Request('http://localhost', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ listUniqueObservationIds: ['obs1'] }),
      }));

      expect(response.status).toBe(403);
    });

    it('returns 204 on success', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);
      vi.mocked(deleteLinkByEntryBulk).mockResolvedValue(undefined as never);

      const response = await DELETE(new Request('http://localhost', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ listUniqueObservationIds: ['obs1'] }),
      }));

      expect(response.status).toBe(204);
    });
  });

  describe('POST', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      vi.mocked(enforceRouteAuth).mockResolvedValue(NextResponse.json({ message: 'Forbidden' }, { status: 403 } as never) as never);

      const response = await POST(new Request('http://localhost', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify([]),
      }));

      expect(response.status).toBe(403);
    });

    it('returns 201 on success', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);
      vi.mocked(createLinksBulk).mockResolvedValue({ created: 1, batchId: 'batch-1' } as never);

      const response = await POST(new Request('http://localhost', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ entries: [{ uniqueObservationIds: ['obs1'], polpalId: 1 }] }),
      }));

      expect(response.status).toBe(201);
    });
  });
});
