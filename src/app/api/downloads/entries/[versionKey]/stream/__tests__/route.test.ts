import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/lib/server/auth.server', () => ({
  getAuthPayload: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));
vi.mock('@/lib/server/rate-limit.server', () => ({
  downloadLimiter: { consume: vi.fn() },
  getClientIp: vi.fn(() => '127.0.0.1'),
}));
vi.mock('@/lib/server/security-events.server', () => ({
  logSecurityEvent: vi.fn(),
}));
vi.mock('@/modules/downloads/downloads.service', () => ({
  streamDownloadEntriesByVersion: vi.fn(),
  canDownloadHiddenContent: vi.fn((role?: string | null) =>
    role != null && ['EDITOR', 'DATAMANAGER', 'ADMIN'].includes(role)),
}));
vi.mock('@/modules/downloads/download-log.service', () => ({
  logDownload: vi.fn(),
}));

import { GET } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getAuthPayload } from '@/lib/server/auth.server';
import { streamDownloadEntriesByVersion } from '@/modules/downloads/downloads.service';
import { downloadLimiter } from '@/lib/server/rate-limit.server';
import { logSecurityEvent } from '@/lib/server/security-events.server';
import { logDownload } from '@/modules/downloads/download-log.service';

async function readStreamBody(response: Response): Promise<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(decoder.decode(value));
  }
  return chunks.join('');
}

describe('/api/downloads/entries/[versionKey]/stream', () => {
  beforeEach(() => {
    vi.mocked(enforceRouteAuth).mockResolvedValue({} as never);
    vi.mocked(getAuthPayload).mockResolvedValue(null as never);
    vi.mocked(downloadLimiter.consume).mockResolvedValue(undefined as never);
    vi.mocked(streamDownloadEntriesByVersion).mockReturnValue(['entry1\n', 'entry2\n'][Symbol.iterator]() as never);
  });

  it('returns streaming CSV on success with filters', async () => {
    const url = 'http://localhost/api/downloads/entries/v1/stream?countries=US,DE&regions=EU&yearFrom=2000&yearTo=2020&variables=gdp,pop&short=true&includeSpecialEntityLinks=false';
    const request = new Request(url);
    const response = await GET(request, { params: Promise.resolve({ versionKey: 'v1' }) });

    expect(enforceRouteAuth).toHaveBeenCalledWith('/api/downloads/entries/[versionKey]/stream', 'GET');
    expect(logDownload).toHaveBeenCalledWith({
      downloadType: 'ENTRIES',
      versionKey: 'v1',
      filters: { countries: ['US', 'DE'], regions: ['EU'], yearFrom: 2000, yearTo: 2020, variables: ['gdp', 'pop'], short: true, includeSpecialEntityLinks: false },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
    expect(response.headers.get('Content-Disposition')).toMatch(/PolPaL_v1_/);

    const body = await readStreamBody(response);
    expect(body).toBe('entry1\nentry2\n');
  });

  it('returns 429 on rate limit hit', async () => {
    vi.mocked(downloadLimiter.consume).mockRejectedValue(new Error('rate limited'));

    const request = new Request('http://localhost/api/downloads/entries/v1/stream');
    const response = await GET(request, { params: Promise.resolve({ versionKey: 'v1' }) });

    expect(logSecurityEvent).toHaveBeenCalledWith('RATE_LIMIT_HIT', { ip: '127.0.0.1', route: '/api/downloads/entries/stream' });
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body).toHaveProperty('message', 'Too many download requests. Please try again later.');
  });

  it('returns auth failure response when not authenticated', async () => {
    vi.mocked(enforceRouteAuth).mockResolvedValue(NextResponse.json({ message: 'Unauthorized' }, { status: 401 }) as never);

    const request = new Request('http://localhost/api/downloads/entries/v1/stream');
    const response = await GET(request, { params: Promise.resolve({ versionKey: 'v1' }) });

    expect(response.status).toBe(401);
  });

  it('returns 400 when versionKey is missing', async () => {
    const request = new Request('http://localhost/api/downloads/entries//stream');
    const response = await GET(request, { params: Promise.resolve({ versionKey: '' }) });

    expect(response.status).toBe(400);
    const text = await response.text();
    expect(text).toBe('versionKey parameter is required');
  });

  it('returns streaming CSV with default filter values', async () => {
    vi.mocked(streamDownloadEntriesByVersion).mockReturnValue(['default\n'][Symbol.iterator]() as never);

    const request = new Request('http://localhost/api/downloads/entries/v1/stream');
    const response = await GET(request, { params: Promise.resolve({ versionKey: 'v1' }) });

    expect(logDownload).toHaveBeenCalledWith({
      downloadType: 'ENTRIES',
      versionKey: 'v1',
      filters: {},
    });
    expect(streamDownloadEntriesByVersion).toHaveBeenCalledWith('v1', {}, false);

    const body = await readStreamBody(response);
    expect(body).toBe('default\n');
  });

  it('passes allowHidden for privileged roles', async () => {
    vi.mocked(getAuthPayload).mockResolvedValue({ userId: 1, role: 'EDITOR' } as never);
    vi.mocked(streamDownloadEntriesByVersion).mockReturnValue(['default\n'][Symbol.iterator]() as never);

    const request = new Request('http://localhost/api/downloads/entries/v1/stream');
    const response = await GET(request, { params: Promise.resolve({ versionKey: 'v1' }) });

    expect(streamDownloadEntriesByVersion).toHaveBeenCalledWith('v1', {}, true);
    expect(response.status).toBe(200);
  });
});
