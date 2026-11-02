import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/authentication/authentication.service', () => ({
  refreshVerificationEmail: vi.fn(),
}));
vi.mock('@/lib/server/rate-limit.server', () => ({
  passwordResetLimiter: { consume: vi.fn() },
  getClientIp: vi.fn().mockReturnValue('127.0.0.1' as never),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { POST } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { refreshVerificationEmail } from '@/modules/authentication/authentication.service';
import { passwordResetLimiter } from '@/lib/server/rate-limit.server';

function makeRequest(body?: unknown) {
  return new Request('http://localhost/api/authentication/resend-verification', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe('/api/authentication/resend-verification route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('POST', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      vi.mocked(enforceRouteAuth).mockResolvedValue(NextResponse.json({ message: 'Forbidden' }, { status: 403 } as never) as never,
      );

      const response = await POST(makeRequest({ email: 'test@test.com' }));
      expect(response.status).toBe(403);
    });

    it('returns 429 when rate limited', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);
      vi.mocked(passwordResetLimiter.consume).mockRejectedValue(new Error('rate limited'));

      const response = await POST(makeRequest({ email: 'test@test.com' }));
      expect(response.status).toBe(429);
      const body = await response.json();
      expect(body.message).toContain('Too many requests');
    });

    it('returns 400 for invalid body', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);
      vi.mocked(passwordResetLimiter.consume).mockResolvedValue(undefined as never);

      const response = await POST(makeRequest({ notanemail: 'bad' }));
      expect(response.status).toBe(400);
    });

    it('returns 200 on success', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);
      vi.mocked(passwordResetLimiter.consume).mockResolvedValue(undefined as never);
      vi.mocked(refreshVerificationEmail).mockResolvedValue(undefined as never);

      const response = await POST(makeRequest({ email: 'test@test.com' }));
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(refreshVerificationEmail).toHaveBeenCalledWith('test@test.com');
    });

    it('returns 500 on service error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);
      vi.mocked(passwordResetLimiter.consume).mockResolvedValue(undefined as never);
      vi.mocked(refreshVerificationEmail).mockRejectedValue(new Error('db error'));

      const response = await POST(makeRequest({ email: 'test@test.com' }));
      expect(response.status).toBe(500);
    });
  });
});
