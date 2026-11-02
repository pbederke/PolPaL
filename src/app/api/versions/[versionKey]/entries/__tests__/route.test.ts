import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/versions/versions.service', () => ({
  getVersionEntries: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { GET } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getVersionEntries } from '@/modules/versions/versions.service';

describe('/api/versions/[versionKey]/entries GET', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 when auth fails', async () => {
    const { NextResponse } = await import('next/server');
    vi.mocked(enforceRouteAuth).mockResolvedValue(
      NextResponse.json({ message: 'Forbidden' }, { status: 403 }) as never
    );

    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ versionKey: 'v1' }) as Promise<{ versionKey: string }>,
    });
    expect(response.status).toBe(403);
  });

  it('returns 200 with data', async () => {
    vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);
    vi.mocked(getVersionEntries).mockResolvedValue([{ entryId: 1 }] as never);

    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ versionKey: 'v1' }) as Promise<{ versionKey: string }>,
    });

    expect(response.status).toBe(200);
  });

  it('returns 500 on error', async () => {
    vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);
    vi.mocked(getVersionEntries).mockRejectedValue(new Error('DB error'));

    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ versionKey: 'v1' }) as Promise<{ versionKey: string }>,
    });

    expect(response.status).toBe(500);
  });
});
