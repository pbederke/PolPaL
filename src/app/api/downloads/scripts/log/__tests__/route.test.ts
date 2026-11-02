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
vi.mock('@/modules/downloads/download-log.service', () => ({
  logDownload: vi.fn(),
}));

import { POST } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { downloadLimiter } from '@/lib/server/rate-limit.server';
import { logDownload } from '@/modules/downloads/download-log.service';

describe('/api/downloads/scripts/log', () => {
  beforeEach(() => {
    vi.mocked(enforceRouteAuth).mockResolvedValue({} as never);
    vi.mocked(downloadLimiter.consume).mockResolvedValue(undefined as never);
  });

  it('returns 204 on success', async () => {
    const request = new Request('http://localhost/api/downloads/scripts/log', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ scriptName: 'my-script' }),
    });
    const response = await POST(request);

    expect(enforceRouteAuth).toHaveBeenCalledWith('/api/downloads/scripts/log', 'POST');
    expect(logDownload).toHaveBeenCalledWith({ downloadType: 'SCRIPT', versionKey: 'my-script', filters: {} });
    expect(response.status).toBe(204);
  });

  it('returns 400 on invalid JSON', async () => {
    const request = new Request('http://localhost/api/downloads/scripts/log', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not json',
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('message', 'Invalid JSON');
  });

  it('returns 400 on bad body schema', async () => {
    const request = new Request('http://localhost/api/downloads/scripts/log', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ scriptName: '' }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('message', 'Invalid request body');
  });

  it('returns 429 on rate limit hit', async () => {
    vi.mocked(downloadLimiter.consume).mockRejectedValue(new Error('rate limited'));

    const request = new Request('http://localhost/api/downloads/scripts/log', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ scriptName: 'test' }),
    });
    const response = await POST(request);

    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body).toHaveProperty('message', 'Too many requests. Please try again later.');
  });

  it('returns auth failure response when not authenticated', async () => {
    vi.mocked(enforceRouteAuth).mockResolvedValue(NextResponse.json({ message: 'Forbidden' }, { status: 403 }) as never);

    const request = new Request('http://localhost/api/downloads/scripts/log', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ scriptName: 'test' }),
    });
    const response = await POST(request);

    expect(response.status).toBe(403);
  });
});
