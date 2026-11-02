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
  streamDownloadGroupings: vi.fn(),
}));
vi.mock('@/modules/downloads/download-log.service', () => ({
  logDownload: vi.fn(),
}));

import { GET } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { streamDownloadGroupings } from '@/modules/downloads/downloads.service';
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

describe('/api/downloads/groupings/stream', () => {
  beforeEach(() => {
    vi.mocked(enforceRouteAuth).mockResolvedValue({} as never);
    vi.mocked(downloadLimiter.consume).mockResolvedValue(undefined as never);
    vi.mocked(streamDownloadGroupings).mockReturnValue(['grp1\n', 'grp2\n'][Symbol.iterator]() as never);
  });

  it('returns streaming CSV on success with no filters', async () => {
    const request = new Request('http://localhost/api/downloads/groupings/stream');
    const response = await GET(request);

    expect(enforceRouteAuth).toHaveBeenCalledWith('/api/downloads/groupings/stream', 'GET');
    expect(logDownload).toHaveBeenCalledWith({ downloadType: 'GROUPINGS', filters: {} });
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');

    const body = await readStreamBody(response);
    expect(body).toBe('grp1\ngrp2\n');
  });

  it('returns streaming CSV on success with filters', async () => {
    vi.mocked(streamDownloadGroupings).mockReturnValue(['filtered\n'][Symbol.iterator]() as never);

    const request = new Request('http://localhost/api/downloads/groupings/stream?countries=US,FR&regions=EU');
    const response = await GET(request);

    expect(logDownload).toHaveBeenCalledWith({ downloadType: 'GROUPINGS', filters: { countries: ['US', 'FR'], regions: ['EU'] } });
    expect(streamDownloadGroupings).toHaveBeenCalledWith({ countries: ['US', 'FR'], regions: ['EU'] });

    const body = await readStreamBody(response);
    expect(body).toBe('filtered\n');
  });

  it('returns 429 on rate limit hit', async () => {
    vi.mocked(downloadLimiter.consume).mockRejectedValue(new Error('rate limited'));

    const request = new Request('http://localhost/api/downloads/groupings/stream');
    const response = await GET(request);

    expect(logSecurityEvent).toHaveBeenCalledWith('RATE_LIMIT_HIT', { ip: '127.0.0.1', route: '/api/downloads/groupings/stream' });
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body).toHaveProperty('message', 'Too many download requests. Please try again later.');
  });

  it('returns auth failure response when not authenticated', async () => {
    vi.mocked(enforceRouteAuth).mockResolvedValue(NextResponse.json({ message: 'Unauthorized' }, { status: 401 }) as never);

    const request = new Request('http://localhost/api/downloads/groupings/stream');
    const response = await GET(request);

    expect(response.status).toBe(401);
  });
});
