import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/authentication/authentication.service', () => ({
  registerUser: vi.fn(),
}));
vi.mock('@/lib/server/rate-limit.server', () => ({
  registerLimiter: { consume: vi.fn() },
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
import { registerUser } from '@/modules/authentication/authentication.service';
import { registerLimiter } from '@/lib/server/rate-limit.server';
import { logSecurityEvent } from '@/lib/server/security-events.server';

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/authentication/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  nameFirst: 'Alice',
  nameLast: 'Smith',
  email: 'alice@test.com',
  username: 'alice',
  password: 'Strong1Pass',
};

describe('/api/authentication/register route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('POST', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      vi.mocked(enforceRouteAuth).mockResolvedValue(
        NextResponse.json({ message: 'Forbidden' }, { status: 403 } as never) as never,
      );

      const response = await POST(makeRequest(validBody));
      expect(response.status).toBe(403);
    });

    it('returns 429 when rate limited', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);
      vi.mocked(registerLimiter.consume).mockRejectedValue(new Error('rate limited'));

      const response = await POST(makeRequest(validBody));
      expect(response.status).toBe(429);
      expect(logSecurityEvent).toHaveBeenCalledWith('REGISTRATION_FLOOD', { ip: '127.0.0.1', route: '/api/authentication/register' });
    });

    it('returns 400 on invalid body', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);
      vi.mocked(registerLimiter.consume).mockResolvedValue(undefined as never);

      const response = await POST(makeRequest({ nameFirst: '', email: 'bad', username: '', password: 'weak' }));
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toContain('Invalid registration data');
    });

    it('returns 200 on successful registration', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);
      vi.mocked(registerLimiter.consume).mockResolvedValue(undefined as never);
      vi.mocked(registerUser).mockResolvedValue(undefined);

      const response = await POST(makeRequest(validBody));
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(registerUser).toHaveBeenCalledWith('Alice', 'Smith', 'alice@test.com', 'alice', 'Strong1Pass');
    });

    it('returns 409 when username already exists', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);
      vi.mocked(registerLimiter.consume).mockResolvedValue(undefined as never);
      vi.mocked(registerUser).mockRejectedValue(new Error('Username already exists'));

      const response = await POST(makeRequest(validBody));
      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body.message).toBe('Username already exists');
    });

    it('returns 500 on unexpected error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);
      vi.mocked(registerLimiter.consume).mockResolvedValue(undefined as never);
      vi.mocked(registerUser).mockRejectedValue(new Error('database error'));

      const response = await POST(makeRequest(validBody));
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.message).toBe('Registration failed');
    });
  });
});
