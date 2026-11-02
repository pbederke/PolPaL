import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/server/route-auth.server', () => ({ enforceRouteAuth: vi.fn() }));
vi.mock('@/modules/users/users.service', () => ({ updatePassword: vi.fn() }));
vi.mock('@/lib/server/rate-limit.server', () => ({
  passwordChangeLimiter: { consume: vi.fn() },
  getClientIp: vi.fn().mockReturnValue('127.0.0.1' as never),
}));
vi.mock('@/lib/server/security-events.server', () => ({ logSecurityEvent: vi.fn() }));
vi.mock('@/lib/server/logger.server', () => ({ default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

import { PUT } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { updatePassword } from '@/modules/users/users.service';
import { passwordChangeLimiter } from '@/lib/server/rate-limit.server';

function makePut(body: unknown) {
  return new NextRequest('http://localhost/api/users/1/password-change', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}
function params(userId: string) {
  return { params: Promise.resolve({ userId }) as Promise<{ userId: string }> };
}

const AUTH = { userId: 1, username: 'alice', role: 'USER', approvedByAdmin: true } as never;

describe('/api/users/[userId]/password-change route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('PUT', () => {
    it('returns 403 when auth fails', async () => {
      const { NextResponse } = await import('next/server');
      vi.mocked(enforceRouteAuth).mockResolvedValue(NextResponse.json({ message: 'Forbidden' }, { status: 403 } as never) as never);
      const response = await PUT(makePut({ oldPassword: 'Old1pass!', newPassword: 'New1pass!' }), params('1'));
      expect(response.status).toBe(403);
    });

    it('returns 400 for invalid userId', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(AUTH);
      const response = await PUT(makePut({ oldPassword: 'Old1pass!', newPassword: 'New1pass!' }), params('abc'));
      expect(response.status).toBe(400);
    });

    it('returns 403 when changing another user password', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(AUTH);
      const response = await PUT(makePut({ oldPassword: 'Old1pass!', newPassword: 'New1pass!' }), params('2'));
      expect(response.status).toBe(403);
    });

    it('returns 429 when rate limited', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(AUTH);
      vi.mocked(passwordChangeLimiter.consume).mockRejectedValue(new Error('Rate limited'));
      const response = await PUT(makePut({ oldPassword: 'Old1pass!', newPassword: 'New1pass!' }), params('1'));
      expect(response.status).toBe(429);
      expect(passwordChangeLimiter.consume).toHaveBeenCalledWith('password-change:1');
    });

    it('returns 200 on success', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(AUTH);
      vi.mocked(passwordChangeLimiter.consume).mockResolvedValue(undefined as never);
      vi.mocked(updatePassword).mockResolvedValue({ success: true });
      const response = await PUT(makePut({ oldPassword: 'Old1pass!', newPassword: 'New1pass!' }), params('1'));
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(updatePassword).toHaveBeenCalledWith(1, 'Old1pass!', 'New1pass!');
    });

    it('returns 400 when current password is incorrect', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(AUTH);
      vi.mocked(updatePassword).mockRejectedValue(new Error('Invalid credentials'));
      const response = await PUT(makePut({ oldPassword: 'wrong', newPassword: 'New1pass!' }), params('1'));
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toContain('incorrect');
    });

    it('returns 500 on unexpected error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(AUTH);
      vi.mocked(updatePassword).mockRejectedValue(new Error('DB error'));
      const response = await PUT(makePut({ oldPassword: 'Old1pass!', newPassword: 'New1pass!' }), params('1'));
      expect(response.status).toBe(500);
    });
  });
});
