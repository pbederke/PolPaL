import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
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
  streamDownloadCountries: vi.fn(),
}));
vi.mock('@/modules/downloads/download-log.service', () => ({
  logDownload: vi.fn(),
}));

import { GET } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { streamDownloadCountries } from '@/modules/downloads/downloads.service';
import { downloadLimiter } from '@/lib/server/rate-limit.server';
import { logSecurityEvent } from '@/lib/server/security-events.server';
import { logDownload } from '@/modules/downloads/download-log.service';

describe('/api/downloads/countries/stream', () => {
  beforeEach(() => {
    vi.mocked(enforceRouteAuth).mockResolvedValue({} as never);
    vi.mocked(downloadLimiter.consume).mockResolvedValue(undefined as never);
    vi.mocked(streamDownloadCountries).mockReturnValue(['col1,col2\n', 'val1,val2\n'][Symbol.iterator]() as never);
  });

  it('returns streaming CSV on success', async () => {
    const request = new Request('http://localhost/api/downloads/countries/stream');
    const response = await GET(request);

    expect(enforceRouteAuth).toHaveBeenCalledWith('/api/downloads/countries/stream', 'GET');
    expect(logDownload).toHaveBeenCalledWith({ downloadType: 'COUNTRIES', filters: {} });
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
    expect(response.headers.get('Content-Disposition')).toMatch(/^attachment; filename=PolPaL_countries_.*\.csv$/);

    const stream = response.body;
    const reader = stream!.getReader();
    const decoder = new TextDecoder();
    const chunks: string[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(decoder.decode(value));
    }
    expect(chunks.join('')).toBe('col1,col2\nval1,val2\n');
  });

  it('returns 429 on rate limit hit', async () => {
    vi.mocked(downloadLimiter.consume).mockRejectedValue(new Error('rate limited'));

    const request = new Request('http://localhost/api/downloads/countries/stream');
    const response = await GET(request);

    expect(logSecurityEvent).toHaveBeenCalledWith('RATE_LIMIT_HIT', { ip: '127.0.0.1', route: '/api/downloads/countries/stream' });
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body).toHaveProperty('message', 'Too many download requests. Please try again later.');
  });

  it('returns auth failure response when not authenticated', async () => {
    const { NextResponse: NR } = await import('next/server');
    vi.mocked(enforceRouteAuth).mockResolvedValue(NR.json({ message: 'Unauthorized' }, { status: 401 }) as never);

    const request = new Request('http://localhost/api/downloads/countries/stream');
    const response = await GET(request);

    expect(response.status).toBe(401);
  });
});
