import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));
vi.mock('@/modules/downloads/downloads.service', () => ({
  getEntryFiltersForVersion: vi.fn(),
}));

import { GET } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getEntryFiltersForVersion } from '@/modules/downloads/downloads.service';

describe('/api/downloads/entries/[versionKey]/filters', () => {
  beforeEach(() => {
    vi.mocked(enforceRouteAuth).mockResolvedValue({} as never);
    vi.mocked(getEntryFiltersForVersion).mockResolvedValue({ countries: ['US'], variables: ['gdp'] } as never);
  });

  it('returns filters on success', async () => {
    const request = new Request('http://localhost/api/downloads/entries/v1/filters');
    const response = await GET(request, { params: Promise.resolve({ versionKey: 'v1' }) });
    const body = await response.json();

    expect(enforceRouteAuth).toHaveBeenCalledWith('/api/downloads/entries/[versionKey]/filters', 'GET');
    expect(getEntryFiltersForVersion).toHaveBeenCalledWith('v1');
    expect(response.status).toBe(200);
    expect(body).toEqual({ countries: ['US'], variables: ['gdp'] });
  });

  it('returns 400 when versionKey is missing', async () => {
    const request = new Request('http://localhost/api/downloads/entries//filters');
    const response = await GET(request, { params: Promise.resolve({ versionKey: '' }) });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('message', 'versionKey is required');
  });

  it('returns 500 on service error', async () => {
    vi.mocked(getEntryFiltersForVersion).mockRejectedValue(new Error('DB error'));

    const request = new Request('http://localhost/api/downloads/entries/v1/filters');
    const response = await GET(request, { params: Promise.resolve({ versionKey: 'v1' }) });

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toHaveProperty('message', 'Internal server error');
  });

  it('returns auth failure response when not authenticated', async () => {
    vi.mocked(enforceRouteAuth).mockResolvedValue(NextResponse.json({ message: 'Forbidden' }, { status: 403 }) as never);

    const request = new Request('http://localhost/api/downloads/entries/v1/filters');
    const response = await GET(request, { params: Promise.resolve({ versionKey: 'v1' }) });

    expect(response.status).toBe(403);
  });
});
