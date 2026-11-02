import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/authentication/authentication.service', () => ({
  verifyUserEmail: vi.fn(),
}));
vi.mock('@/lib/server/email.server', () => ({
  sendAdminApprovalRequestEmail: vi.fn(),
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

import { GET } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { verifyUserEmail } from '@/modules/authentication/authentication.service';
import { sendAdminApprovalRequestEmail } from '@/lib/server/email.server';
import { loginLimiter } from '@/lib/server/rate-limit.server';
import { logSecurityEvent } from '@/lib/server/security-events.server';

describe('/api/authentication/verify-email route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      vi.mocked(enforceRouteAuth).mockResolvedValue(NextResponse.json({ message: 'Forbidden' }, { status: 403 } as never) as never,
      );

      const response = await GET(new NextRequest('http://localhost/api/authentication/verify-email?token=abc'));
      expect(response.status).toBe(403);
    });

    it('redirects to rate_limited when rate limit is exceeded', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(null as never);
      vi.mocked(loginLimiter.consume).mockRejectedValue(new Error('Rate limited'));

      const response = await GET(new NextRequest('http://localhost/api/authentication/verify-email?token=abc'));
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('error=rate_limited');
      expect(logSecurityEvent).toHaveBeenCalledWith('RATE_LIMIT_HIT', expect.objectContaining({
        route: '/api/authentication/verify-email',
      }));
    });

    it('redirects to error when token is missing', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);
      vi.mocked(loginLimiter.consume).mockResolvedValue(undefined as never);

      const response = await GET(new NextRequest('http://localhost/api/authentication/verify-email'));
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('error=missing_token');
    });

    it('redirects to login on successful verification', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);
      vi.mocked(loginLimiter.consume).mockResolvedValue(undefined as never);
      vi.mocked(verifyUserEmail).mockResolvedValue({ username: 'user1', email: 'user1@test.com', adminEmails: [] } as never);

      const response = await GET(new NextRequest('http://localhost/api/authentication/verify-email?token=valid'));
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('verified=true');
      expect(verifyUserEmail).toHaveBeenCalledWith('valid');
    });

    it('sends admin approval email when adminEmails is non-empty', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);
      vi.mocked(loginLimiter.consume).mockResolvedValue(undefined as never);
      vi.mocked(verifyUserEmail).mockResolvedValue({ username: 'user1', email: 'user1@test.com', adminEmails: ['admin@test.com'] } as never);
      vi.mocked(sendAdminApprovalRequestEmail).mockResolvedValue(undefined as never);

      await GET(new NextRequest('http://localhost/api/authentication/verify-email?token=valid'));

      expect(sendAdminApprovalRequestEmail).toHaveBeenCalledWith(['admin@test.com'], 'user1', 'user1@test.com');
    });

    it('redirects to invalid_token error on INVALID_TOKEN', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);
      vi.mocked(loginLimiter.consume).mockResolvedValue(undefined as never);
      const err = new Error('invalid') as Error & { code: string };
      err.code = 'INVALID_TOKEN';
      vi.mocked(verifyUserEmail).mockRejectedValue(err);

      const response = await GET(new NextRequest('http://localhost/api/authentication/verify-email?token=bad'));
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('error=invalid_token');
    });

    it('redirects to expired_token error on EXPIRED_TOKEN', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);
      vi.mocked(loginLimiter.consume).mockResolvedValue(undefined as never);
      const err = new Error('expired') as Error & { code: string };
      err.code = 'EXPIRED_TOKEN';
      vi.mocked(verifyUserEmail).mockRejectedValue(err);

      const response = await GET(new NextRequest('http://localhost/api/authentication/verify-email?token=old'));
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('error=expired_token');
    });

    it('redirects to server_error on unknown error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);
      vi.mocked(loginLimiter.consume).mockResolvedValue(undefined as never);
      vi.mocked(verifyUserEmail).mockRejectedValue(new Error('unknown'));

      const response = await GET(new NextRequest('http://localhost/api/authentication/verify-email?token=xyz'));
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('error=server_error');
    });
  });
});
