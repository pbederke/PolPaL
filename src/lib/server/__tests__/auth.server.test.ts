import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma, mockLogger, ADMIN_AUTH } from '@/__test-utils__/mocks';

vi.mock('@/lib/server/prisma.server', () => ({ prisma: mockPrisma() }));
vi.mock('@/lib/server/logger.server', () => ({ default: mockLogger() }));
vi.mock('@/lib/server/security-events.server', () => ({ logSecurityEvent: vi.fn() }));
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({ get: vi.fn() }),
}));
vi.mock('jose', () => ({
  jwtVerify: vi.fn(),
}));

import { prisma } from '@/lib/server/prisma.server';
import { getAuthPayload, requireAuth } from '../auth.server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

describe('auth.server', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.KEY_ENCRYPTION = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  });

  describe('getAuthPayload', () => {
    it('returns null when no token cookie exists', async () => {
      vi.mocked(cookies).mockResolvedValue({ get: vi.fn().mockReturnValue(undefined as never) } as never);

      const result = await getAuthPayload();
      expect(result).toBeNull();
    });

    it('returns null when KEY_ENCRYPTION is not set', async () => {
      delete process.env.KEY_ENCRYPTION;
      vi.mocked(cookies).mockResolvedValue({ get: vi.fn().mockReturnValue({ value: 'token' } as never) } as never);

      const result = await getAuthPayload();
      expect(result).toBeNull();
    });

    it('returns null on invalid JWT', async () => {
      vi.mocked(cookies).mockResolvedValue({ get: vi.fn().mockReturnValue({ value: 'bad-token' } as never) } as never);
      vi.mocked(jwtVerify).mockRejectedValue(new Error('invalid'));

      const result = await getAuthPayload();
      expect(result).toBeNull();
    });

    it('returns auth payload on valid token with matching tokenVersion', async () => {
      vi.mocked(cookies).mockResolvedValue({ get: vi.fn().mockReturnValue({ value: 'good-token' } as never) } as never);
      vi.mocked(jwtVerify).mockResolvedValue({
        payload: { userId: '1', username: 'alice', tokenVersion: 0 },
      } as never);
      vi.mocked(prisma.users.findUnique).mockResolvedValue({
        tokenVersion: 0, role: 'ADMIN', approvedByAdmin: true,
      } as never);

      const result = await getAuthPayload();

      expect(result).toEqual({
        userId: 1, username: 'alice', role: 'ADMIN', approvedByAdmin: true,
      });
    });

    it('returns null when tokenVersion does not match (revoked token)', async () => {
      vi.mocked(cookies).mockResolvedValue({ get: vi.fn().mockReturnValue({ value: 'revoked-token' } as never) } as never);
      vi.mocked(jwtVerify).mockResolvedValue({
        payload: { userId: '1', username: 'alice', tokenVersion: 0 },
      } as never);
      vi.mocked(prisma.users.findUnique).mockResolvedValue({
        tokenVersion: 1, role: 'ADMIN', approvedByAdmin: true,
      } as never);

      const result = await getAuthPayload();
      expect(result).toBeNull();
    });
  });

  describe('requireAuth', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(cookies).mockResolvedValue({ get: vi.fn().mockReturnValue(undefined as never) } as never);

      const result = await requireAuth();
      expect(result).toHaveProperty('status', 401);
    });

    it('returns 403 when role is insufficient', async () => {
      vi.mocked(cookies).mockResolvedValue({ get: vi.fn().mockReturnValue({ value: 'token' } as never) } as never);
      vi.mocked(jwtVerify).mockResolvedValue({
        payload: { userId: '2', username: 'user', tokenVersion: 0 },
      } as never);
      vi.mocked(prisma.users.findUnique).mockResolvedValue({
        tokenVersion: 0, role: 'USER', approvedByAdmin: true,
      } as never);

      const result = await requireAuth(['ADMIN']);
      expect(result).toHaveProperty('status', 403);
    });

    it('returns 403 when user not approved by admin', async () => {
      vi.mocked(cookies).mockResolvedValue({ get: vi.fn().mockReturnValue({ value: 'token' } as never) } as never);
      vi.mocked(jwtVerify).mockResolvedValue({
        payload: { userId: '2', username: 'user', tokenVersion: 0 },
      } as never);
      vi.mocked(prisma.users.findUnique).mockResolvedValue({
        tokenVersion: 0, role: 'USER', approvedByAdmin: false,
      } as never);

      const result = await requireAuth();
      expect(result).toHaveProperty('status', 403);
    });

    it('returns AuthPayload when authenticated with correct role', async () => {
      vi.mocked(cookies).mockResolvedValue({ get: vi.fn().mockReturnValue({ value: 'token' } as never) } as never);
      vi.mocked(jwtVerify).mockResolvedValue({
        payload: { userId: '1', username: 'admin', tokenVersion: 0 },
      } as never);
      vi.mocked(prisma.users.findUnique).mockResolvedValue({
        tokenVersion: 0, role: 'ADMIN', approvedByAdmin: true,
      } as never);

      const result = await requireAuth(['ADMIN']);
      expect(result).toEqual(ADMIN_AUTH);
    });

    it('skips approval check when requireApprovedByAdmin is false', async () => {
      vi.mocked(cookies).mockResolvedValue({ get: vi.fn().mockReturnValue({ value: 'token' } as never) } as never);
      vi.mocked(jwtVerify).mockResolvedValue({
        payload: { userId: '2', username: 'user', tokenVersion: 0 },
      } as never);
      vi.mocked(prisma.users.findUnique).mockResolvedValue({
        tokenVersion: 0, role: 'USER', approvedByAdmin: false,
      } as never);

      const result = await requireAuth(undefined, false);
      expect(result).toHaveProperty('userId', 2);
    });
  });
});
