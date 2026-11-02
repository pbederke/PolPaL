import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/links/links.service', () => ({
  deleteLinkByEntriesAndPolpalId: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { DELETE } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { deleteLinkByEntriesAndPolpalId } from '@/modules/links/links.service';

describe('/api/links/by-entries-polpal DELETE', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 when forbidden', async () => {
    const { NextResponse } = await import('next/server');
    vi.mocked(enforceRouteAuth).mockResolvedValue(NextResponse.json({ message: 'Forbidden' }, { status: 403 } as never) as never);

    const response = await DELETE(new Request('http://localhost', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ uniqueObservationIds: ['obs1'], polpalId: 1 }),
    }));

    expect(response.status).toBe(403);
  });

  it('returns 204 on success', async () => {
    vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);
    vi.mocked(deleteLinkByEntriesAndPolpalId).mockResolvedValue(undefined as never);

    const response = await DELETE(new Request('http://localhost', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ uniqueObservationIds: ['obs1'], polpalId: 1 }),
    }));

    expect(response.status).toBe(204);
  });

  it('returns 500 on error', async () => {
    vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);
    vi.mocked(deleteLinkByEntriesAndPolpalId).mockRejectedValue(new Error('DB error'));

    const response = await DELETE(new Request('http://localhost', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ uniqueObservationIds: ['obs1'], polpalId: 1 }),
    }));

    expect(response.status).toBe(500);
  });
});
