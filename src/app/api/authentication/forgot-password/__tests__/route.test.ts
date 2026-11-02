import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/authentication/authentication.service', () => ({
  requestPasswordReset: vi.fn(),
}));
vi.mock('@/modules/authentication/authentication.schema', async () => {
  const z = await import('zod');
  return {
    ForgotPasswordSchema: z.default.object({
      email: z.default.email(),
    }),
  };
});
vi.mock('@/lib/server/rate-limit.server', () => ({
  passwordResetLimiter: { consume: vi.fn() },
  getClientIp: vi.fn().mockReturnValue('127.0.0.1' as never),
}));
vi.mock('@/lib/server/security-events.server', () => ({
  logSecurityEvent: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { POST } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { requestPasswordReset } from '@/modules/authentication/authentication.service';
import { passwordResetLimiter } from '@/lib/server/rate-limit.server';

describe('/api/authentication/forgot-password route', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 when auth fails', async () => {
    const { NextResponse } = await import('next/server');
    const forbiddenResponse = NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    vi.mocked(enforceRouteAuth).mockResolvedValue(forbiddenResponse as never);

    const request = new Request('http://localhost/api/authentication/forgot-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it('returns 429 on rate limit', async () => {
    vi.mocked(enforceRouteAuth).mockResolvedValue({
      userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true,
    } as never);
    vi.mocked(passwordResetLimiter.consume).mockRejectedValue(new Error('Rate limited'));

    const request = new Request('http://localhost/api/authentication/forgot-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(429);
  });

  it('returns 400 on invalid email', async () => {
    vi.mocked(enforceRouteAuth).mockResolvedValue({
      userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true,
    } as never);
    vi.mocked(passwordResetLimiter.consume).mockResolvedValue(undefined as never);

    const request = new Request('http://localhost/api/authentication/forgot-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('returns 200 on success', async () => {
    vi.mocked(enforceRouteAuth).mockResolvedValue({
      userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true,
    } as never);
    vi.mocked(passwordResetLimiter.consume).mockResolvedValue(undefined as never);
    vi.mocked(requestPasswordReset).mockResolvedValue(undefined as never);

    const request = new Request('http://localhost/api/authentication/forgot-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ success: true });
    expect(requestPasswordReset).toHaveBeenCalledWith('test@test.com');
  });
});
