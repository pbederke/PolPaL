import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/entities-in-countries/entities-in-countries.service', () => ({
  getGroupingsByPolpalId: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { GET } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getGroupingsByPolpalId } from '@/modules/entities-in-countries/entities-in-countries.service';

describe('/api/entities-in-countries/groupings/[polpalId] GET', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 when auth fails', async () => {
    const { NextResponse } = await import('next/server');
    vi.mocked(enforceRouteAuth).mockResolvedValue(
      NextResponse.json({ message: 'Forbidden' }, { status: 403 }) as never
    );

    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ polpalId: '1' }) as Promise<{ polpalId: string }>,
    });
    expect(response.status).toBe(403);
  });

  it('returns 200 with data', async () => {
    vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);
    vi.mocked(getGroupingsByPolpalId).mockResolvedValue([{ polpalId: 1 }] as never);

    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ polpalId: '1' }) as Promise<{ polpalId: string }>,
    });

    expect(response.status).toBe(200);
  });

  it('returns 500 on error', async () => {
    vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);
    vi.mocked(getGroupingsByPolpalId).mockRejectedValue(new Error('DB error'));

    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ polpalId: '1' }) as Promise<{ polpalId: string }>,
    });

    expect(response.status).toBe(500);
  });
});
