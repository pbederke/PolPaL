import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/links/links.service', () => ({
  createAutoLinksBulk: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { POST } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { createAutoLinksBulk } from '@/modules/links/links.service';

describe('/api/links/auto-import POST', () => {
  beforeEach(() => vi.clearAllMocks());

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
    vi.mocked(createAutoLinksBulk).mockResolvedValue({ created: 1, batchId: 'batch-1' } as never);

    const response = await POST(new Request('http://localhost', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify([{ uniqueObservationId: 'obs1', polpalId: 1 }]),
    }));

    expect(response.status).toBe(201);
  });

  it('returns 500 on error', async () => {
    vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);
    vi.mocked(createAutoLinksBulk).mockRejectedValue(new Error('DB error'));

    const response = await POST(new Request('http://localhost', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify([{ uniqueObservationId: 'obs1', polpalId: 1 }]),
    }));

    expect(response.status).toBe(500);
  });
});
