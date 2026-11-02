import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/entities/entities.service', () => ({
  getCachedEntityLogo: vi.fn(),
  cacheEntityLogo: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { GET } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { NextRequest } from 'next/server';

describe('/api/wikidata-logo GET', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 when auth fails', async () => {
    const { NextResponse } = await import('next/server');
    vi.mocked(enforceRouteAuth).mockResolvedValue(
      NextResponse.json({ message: 'Forbidden' }, { status: 403 }) as never
    );

    const request = new NextRequest(new URL('http://localhost/api/wikidata-logo?id=Q123'));
    const response = await GET(request);
    expect(response.status).toBe(403);
  });

  it('returns 200 with logo', async () => {
    vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);

    const request = new NextRequest(new URL('http://localhost/api/wikidata-logo?id=Q123'));
    const response = await GET(request);

    expect(response.status).toBe(200);
  });

  it('returns 500 on error', async () => {
    vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);
    const { getCachedEntityLogo } = await import('@/modules/entities/entities.service');
    vi.mocked(getCachedEntityLogo).mockRejectedValue(new Error('DB error'));

    const request = new NextRequest(new URL('http://localhost/api/wikidata-logo?id=Q123'));
    const response = await GET(request);

    expect(response.status).toBe(500);
  });
});
