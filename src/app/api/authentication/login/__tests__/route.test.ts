import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/authentication/authentication.service', () => ({
  loginUser: vi.fn(),
}));
vi.mock('@/lib/server/rate-limit.server', () => ({
  loginLimiter: { consume: vi.fn() },
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}));
vi.mock('@/lib/server/security-events.server', () => ({
  logSecurityEvent: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { POST } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { loginUser } from '@/modules/authentication/authentication.service';
import { loginLimiter } from '@/lib/server/rate-limit.server';
import { logSecurityEvent } from '@/lib/server/security-events.server';

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/authentication/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/authentication/login route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('POST', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      vi.mocked(enforceRouteAuth).mockResolvedValue(
        NextResponse.json({ message: 'Forbidden' }, { status: 403 } as never) as never,
      );

      const response = await POST(makeRequest({ identifier: 'user', password: 'pass' }));
      expect(response.status).toBe(403);
    });

    it('returns 429 when rate limited', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);
      vi.mocked(loginLimiter.consume).mockRejectedValue(new Error('rate limited'));

      const response = await POST(makeRequest({ identifier: 'user', password: 'pass' }));
      expect(response.status).toBe(429);
      expect(logSecurityEvent).toHaveBeenCalledWith('RATE_LIMIT_HIT', { ip: '127.0.0.1', route: '/api/authentication/login' });
    });

    it('returns 400 on invalid body', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);
      vi.mocked(loginLimiter.consume).mockResolvedValue(undefined as never);

      const response = await POST(makeRequest({ identifier: '', password: '' }));
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe('Invalid request body');
    });

    it('returns 200 on successful login', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);
      vi.mocked(loginLimiter.consume).mockResolvedValue(undefined as never);
      vi.mocked(loginUser).mockResolvedValue('jwt-token-abc');

      const response = await POST(makeRequest({ identifier: 'alice', password: 'pass123' }));
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(loginUser).toHaveBeenCalledWith('alice', 'pass123');
      const cookie = response.headers.get('set-cookie');
      expect(cookie).toContain('polpal_token=jwt-token-abc');
      expect(cookie).toContain('HttpOnly');
    });

    it('returns 403 for unverified email', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);
      vi.mocked(loginLimiter.consume).mockResolvedValue(undefined as never);
      vi.mocked(loginUser).mockRejectedValue(new Error('Please verify your email address before logging in.'));

      const response = await POST(makeRequest({ identifier: 'alice', password: 'pass' }));
      expect(response.status).toBe(403);
      expect(logSecurityEvent).toHaveBeenCalledWith('AUTH_FAILURE', { ip: '127.0.0.1', reason: 'email_not_verified' });
    });

    it('returns 403 for unapproved account', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);
      vi.mocked(loginLimiter.consume).mockResolvedValue(undefined as never);
      vi.mocked(loginUser).mockRejectedValue(new Error('Your account is pending admin approval.'));

      const response = await POST(makeRequest({ identifier: 'alice', password: 'pass' }));
      expect(response.status).toBe(403);
      expect(logSecurityEvent).toHaveBeenCalledWith('AUTH_FAILURE', { ip: '127.0.0.1', reason: 'not_approved_by_admin' });
    });

    it('returns 400 for invalid credentials', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);
      vi.mocked(loginLimiter.consume).mockResolvedValue(undefined as never);
      vi.mocked(loginUser).mockRejectedValue(new Error('Invalid credentials'));

      const response = await POST(makeRequest({ identifier: 'alice', password: 'wrong' }));
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe('Login failed');
      expect(logSecurityEvent).toHaveBeenCalledWith('AUTH_FAILURE', { ip: '127.0.0.1', reason: 'invalid_credentials' });
    });

    it('returns 500 on unexpected error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);
      vi.mocked(loginLimiter.consume).mockResolvedValue(undefined as never);
      vi.mocked(loginUser).mockRejectedValue(new Error('database connection lost'));

      const response = await POST(makeRequest({ identifier: 'alice', password: 'pass' }));
      expect(response.status).toBe(500);
    });
  });
});
