import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/authentication/authentication.schema', async () => {
  const z = await import('zod');
  return {
    ValidateEmailSchema: z.default.object({
      email: z.default.email(),
    }),
  };
});
vi.mock('disposable-email-detector', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/lib/server/rate-limit.server', () => ({
  validateEmailLimiter: { consume: vi.fn() },
  getClientIp: vi.fn().mockReturnValue('127.0.0.1' as never),
}));
vi.mock('@/lib/server/security-events.server', () => ({
  logSecurityEvent: vi.fn(),
}));

import { POST } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import disposableEmailDetector from 'disposable-email-detector';
import { validateEmailLimiter } from '@/lib/server/rate-limit.server';

describe('/api/validate-email route', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 when forbidden', async () => {
    const { NextResponse } = await import('next/server');
    const forbiddenResponse = NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    vi.mocked(enforceRouteAuth).mockResolvedValue(forbiddenResponse as never);

    const request = new Request('http://localhost/api/validate-email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it('returns 429 when rate limited', async () => {
    vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1 } as never);
    vi.mocked(validateEmailLimiter.consume).mockRejectedValue(new Error('Rate limit'));

    const request = new Request('http://localhost/api/validate-email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body).toHaveProperty('message', 'Too many requests. Please try again later.');
  });

  it('returns 400 on invalid email', async () => {
    vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1 } as never);
    vi.mocked(validateEmailLimiter.consume).mockResolvedValue(undefined as never);

    const request = new Request('http://localhost/api/validate-email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('message', 'Valid email address is required.');
  });

  it('returns 200 with isDisposableEmail=false for valid non-disposable email', async () => {
    vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1 } as never);
    vi.mocked(validateEmailLimiter.consume).mockResolvedValue(undefined as never);
    vi.mocked(disposableEmailDetector).mockResolvedValue(false as never);

    const request = new Request('http://localhost/api/validate-email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ isDisposableEmail: false });
    expect(disposableEmailDetector).toHaveBeenCalledWith('test@example.com');
  });

  it('returns 200 with isDisposableEmail=true for disposable email', async () => {
    vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1 } as never);
    vi.mocked(validateEmailLimiter.consume).mockResolvedValue(undefined as never);
    vi.mocked(disposableEmailDetector).mockResolvedValue(true as never);

    const request = new Request('http://localhost/api/validate-email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'temp@guerrillamail.com' }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ isDisposableEmail: true });
  });

  it('returns 500 on service error', async () => {
    vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1 } as never);
    vi.mocked(validateEmailLimiter.consume).mockResolvedValue(undefined as never);
    vi.mocked(disposableEmailDetector).mockRejectedValue(new Error('Service error'));

    const request = new Request('http://localhost/api/validate-email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toHaveProperty('message', 'Error checking email. Please try again.');
  });
});
