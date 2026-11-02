import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/authentication/authentication.service', () => ({
  resetPassword: vi.fn(),
}));
vi.mock('@/modules/authentication/authentication.schema', async () => {
  const z = await import('zod');
  return {
    ResetPasswordSchema: z.default.object({
      token: z.default.string().min(1),
      password: z.default.string().min(8),
    }),
  };
});
vi.mock('@/lib/server/rate-limit.server', () => ({
  loginLimiter: { consume: vi.fn() },
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
import { resetPassword } from '@/modules/authentication/authentication.service';
import { loginLimiter } from '@/lib/server/rate-limit.server';

describe('/api/authentication/reset-password route', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 when auth fails', async () => {
    const { NextResponse } = await import('next/server');
    const forbiddenResponse = NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    vi.mocked(enforceRouteAuth).mockResolvedValue(forbiddenResponse as never);

    const request = new Request('http://localhost/api/authentication/reset-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'abc', password: 'NewPass1' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it('returns 400 on invalid body', async () => {
    vi.mocked(enforceRouteAuth).mockResolvedValue({
      userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true,
    } as never);
    vi.mocked(loginLimiter.consume).mockResolvedValue(undefined as never);

    const request = new Request('http://localhost/api/authentication/reset-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: '', password: '' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('returns 200 on success', async () => {
    vi.mocked(enforceRouteAuth).mockResolvedValue({
      userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true,
    } as never);
    vi.mocked(loginLimiter.consume).mockResolvedValue(undefined as never);
    vi.mocked(resetPassword).mockResolvedValue(undefined as never);

    const request = new Request('http://localhost/api/authentication/reset-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'valid-token', password: 'NewPass1' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ success: true });
    expect(resetPassword).toHaveBeenCalledWith('valid-token', 'NewPass1');
  });

  it('returns 500 on service error', async () => {
    vi.mocked(enforceRouteAuth).mockResolvedValue({
      userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true,
    } as never);
    vi.mocked(loginLimiter.consume).mockResolvedValue(undefined as never);
    vi.mocked(resetPassword).mockRejectedValue(new Error('Unexpected failure'));

    const request = new Request('http://localhost/api/authentication/reset-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'valid-token', password: 'NewPass1' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
  });
});
