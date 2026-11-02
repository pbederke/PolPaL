import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  streamDownloadVersionsOverview: vi.fn(),
  canDownloadHiddenContent: vi.fn((role?: string | null) =>
    role != null && ['EDITOR', 'DATAMANAGER', 'ADMIN'].includes(role)),
}));
vi.mock('@/modules/downloads/download-log.service', () => ({
  logDownload: vi.fn(),
}));

import { GET } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getAuthPayload } from '@/lib/server/auth.server';
import { streamDownloadVersionsOverview } from '@/modules/downloads/downloads.service';
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

describe('/api/downloads/versions-overview/stream', () => {
  beforeEach(() => {
    vi.mocked(enforceRouteAuth).mockResolvedValue(null as never);
    vi.mocked(downloadLimiter.consume).mockResolvedValue(undefined as never);
    vi.mocked(streamDownloadVersionsOverview).mockReturnValue(['v1,data\n'][Symbol.iterator]() as never);
  });

  it('returns streaming CSV on success with auth', async () => {
    vi.mocked(getAuthPayload).mockResolvedValue({ userId: 1, role: 'ADMIN' } as never);

    const request = new Request('http://localhost/api/downloads/versions-overview/stream');
    const response = await GET(request);

    expect(getAuthPayload).toHaveBeenCalled();
    expect(logDownload).toHaveBeenCalledWith({ downloadType: 'VERSIONS_OVERVIEW', filters: {} });
    expect(streamDownloadVersionsOverview).toHaveBeenCalledWith(true);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
    expect(response.headers.get('Content-Disposition')).toMatch(/PolPaL_versions-overview_/);

    const body = await readStreamBody(response);
    expect(body).toBe('v1,data\n');
  });

  it('returns streaming CSV on success without auth (public access)', async () => {
    vi.mocked(getAuthPayload).mockResolvedValue(null);
    vi.mocked(streamDownloadVersionsOverview).mockReturnValue(['public,data\n'][Symbol.iterator]() as never);

    const request = new Request('http://localhost/api/downloads/versions-overview/stream');
    const response = await GET(request);

    expect(getAuthPayload).toHaveBeenCalled();
    expect(streamDownloadVersionsOverview).toHaveBeenCalledWith(false);
    expect(response.status).toBe(200);

    const body = await readStreamBody(response);
    expect(body).toBe('public,data\n');
  });

  it('passes allowHidden=false for non-privileged roles', async () => {
    vi.mocked(getAuthPayload).mockResolvedValue({ userId: 1, role: 'CONTRIBUTOR' } as never);

    const request = new Request('http://localhost/api/downloads/versions-overview/stream');
    const response = await GET(request);

    expect(streamDownloadVersionsOverview).toHaveBeenCalledWith(false);
    expect(response.status).toBe(200);
  });

  it('returns 429 on rate limit hit', async () => {
    vi.mocked(downloadLimiter.consume).mockRejectedValue(new Error('rate limited'));

    const request = new Request('http://localhost/api/downloads/versions-overview/stream');
    const response = await GET(request);

    expect(logSecurityEvent).toHaveBeenCalledWith('RATE_LIMIT_HIT', { ip: '127.0.0.1', route: '/api/downloads/versions-overview/stream' });
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body).toHaveProperty('message', 'Too many download requests. Please try again later.');
  });
});
