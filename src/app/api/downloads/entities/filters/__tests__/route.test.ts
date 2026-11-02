import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));
vi.mock('@/modules/downloads/downloads.service', () => ({
  getEntityFilters: vi.fn(),
}));

import { GET } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getEntityFilters } from '@/modules/downloads/downloads.service';

describe('/api/downloads/entities/filters', () => {
  beforeEach(() => {
    vi.mocked(enforceRouteAuth).mockResolvedValue({} as never);
    vi.mocked(getEntityFilters).mockResolvedValue({ countries: ['US'], regions: ['EU'] } as never);
  });

  it('returns filters on success', async () => {
    const response = await GET();
    const body = await response.json();

    expect(enforceRouteAuth).toHaveBeenCalledWith('/api/downloads/entities/filters', 'GET');
    expect(response.status).toBe(200);
    expect(body).toEqual({ countries: ['US'], regions: ['EU'] });
  });

  it('returns 500 on service error', async () => {
    vi.mocked(getEntityFilters).mockRejectedValue(new Error('DB error'));

    const response = await GET();
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toHaveProperty('message', 'Internal server error');
  });

  it('returns auth failure response when not authenticated', async () => {
    vi.mocked(enforceRouteAuth).mockResolvedValue(NextResponse.json({ message: 'Forbidden' }, { status: 403 }) as never);

    const response = await GET();
    expect(response.status).toBe(403);
  });
});
