import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

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
  streamDownloadEntities: vi.fn(),
}));
vi.mock('@/modules/downloads/download-log.service', () => ({
  logDownload: vi.fn(),
}));

import { GET } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { streamDownloadEntities } from '@/modules/downloads/downloads.service';
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

describe('/api/downloads/entities/stream', () => {
  beforeEach(() => {
    vi.mocked(enforceRouteAuth).mockResolvedValue({} as never);
    vi.mocked(downloadLimiter.consume).mockResolvedValue(undefined as never);
    vi.mocked(streamDownloadEntities).mockReturnValue(['col1\n', 'data1\n'][Symbol.iterator]() as never);
  });

  it('returns streaming CSV on success with no filters', async () => {
    const request = new Request('http://localhost/api/downloads/entities/stream');
    const response = await GET(request);

    expect(enforceRouteAuth).toHaveBeenCalledWith('/api/downloads/entities/stream', 'GET');
    expect(logDownload).toHaveBeenCalledWith({ downloadType: 'ENTITIES', filters: {} });
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');

    const body = await readStreamBody(response);
    expect(body).toBe('col1\ndata1\n');
  });

  it('returns streaming CSV on success with countries and regions filters', async () => {
    vi.mocked(streamDownloadEntities).mockReturnValue(['filtered\n'][Symbol.iterator]() as never);

    const request = new Request('http://localhost/api/downloads/entities/stream?countries=US,DE&regions=EU');
    const response = await GET(request);

    expect(logDownload).toHaveBeenCalledWith({ downloadType: 'ENTITIES', filters: { countries: ['US', 'DE'], regions: ['EU'] } });
    expect(streamDownloadEntities).toHaveBeenCalledWith({ countries: ['US', 'DE'], regions: ['EU'] });

    const body = await readStreamBody(response);
    expect(body).toBe('filtered\n');
  });

  it('returns 429 on rate limit hit', async () => {
    vi.mocked(downloadLimiter.consume).mockRejectedValue(new Error('rate limited'));

    const request = new Request('http://localhost/api/downloads/entities/stream');
    const response = await GET(request);

    expect(logSecurityEvent).toHaveBeenCalledWith('RATE_LIMIT_HIT', { ip: '127.0.0.1', route: '/api/downloads/entities/stream' });
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body).toHaveProperty('message', 'Too many download requests. Please try again later.');
  });

  it('returns auth failure response when not authenticated', async () => {
    vi.mocked(enforceRouteAuth).mockResolvedValue(NextResponse.json({ message: 'Unauthorized' }, { status: 401 }) as never);

    const request = new Request('http://localhost/api/downloads/entities/stream');
    const response = await GET(request);

    expect(response.status).toBe(401);
  });
});
