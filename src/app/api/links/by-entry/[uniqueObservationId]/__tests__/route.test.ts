import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/links/links.service', () => ({
  deleteLinkByEntry: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { DELETE } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { deleteLinkByEntry } from '@/modules/links/links.service';

describe('/api/links/by-entry/[uniqueObservationId] DELETE', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 when forbidden', async () => {
    const { NextResponse } = await import('next/server');
    vi.mocked(enforceRouteAuth).mockResolvedValue(NextResponse.json({ message: 'Forbidden' }, { status: 403 } as never) as never);

    const response = await DELETE(new Request('http://localhost', { method: 'DELETE' }), {
      params: Promise.resolve({ uniqueObservationId: 'obs1' }) as Promise<{ uniqueObservationId: string }>,
    });

    expect(response.status).toBe(403);
  });

  it('returns 204 on success', async () => {
    vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);
    vi.mocked(deleteLinkByEntry).mockResolvedValue(undefined as never);

    const response = await DELETE(new Request('http://localhost', { method: 'DELETE' }), {
      params: Promise.resolve({ uniqueObservationId: 'obs1' }) as Promise<{ uniqueObservationId: string }>,
    });

    expect(response.status).toBe(204);
  });

  it('returns 500 on error', async () => {
    vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);
    vi.mocked(deleteLinkByEntry).mockRejectedValue(new Error('DB error'));

    const response = await DELETE(new Request('http://localhost', { method: 'DELETE' }), {
      params: Promise.resolve({ uniqueObservationId: 'obs1' }) as Promise<{ uniqueObservationId: string }>,
    });

    expect(response.status).toBe(500);
  });
});
