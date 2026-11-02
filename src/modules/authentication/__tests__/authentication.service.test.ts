import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma, mockLogger } from '@/__test-utils__/mocks';

vi.mock('@/lib/server/prisma.server', () => ({ prisma: mockPrisma() }));
vi.mock('@/lib/server/logger.server', () => ({ default: mockLogger() }));
vi.mock('@/lib/server/email.server', () => ({
  sendVerificationEmail: vi.fn(),
  sendEmailAlreadyRegisteredEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
    hashSync: vi.fn().mockReturnValue('dummy-hash' as never),
    compare: vi.fn(),
  },
}));

import { prisma } from '@/lib/server/prisma.server';
import bcrypt from 'bcrypt';
import { loginUser, registerUser, requestPasswordReset, resetPassword, verifyUserEmail, verifyToken, refreshVerificationEmail } from '../authentication.service';
import { sendVerificationEmail, sendEmailAlreadyRegisteredEmail, sendPasswordResetEmail } from '@/lib/server/email.server';
import { RoleEnum } from '@/lib/shared/enums';

describe('authentication.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.KEY_ENCRYPTION = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  });

  describe('loginUser', () => {
    const mockUser = {
      userId: 1, email: 'a@b.com', username: 'alice', password: 'hashed',
      emailVerified: true, approvedByAdmin: true, role: RoleEnum.USER, tokenVersion: 0,
      createdAt: new Date(), updatedAt: new Date(),
    };

    it('returns a JWT token on valid credentials', async () => {
      vi.mocked(prisma.users.findFirst).mockResolvedValue(mockUser as never);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const token = await loginUser('alice', 'password123');
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('throws on invalid credentials', async () => {
      vi.mocked(prisma.users.findFirst).mockResolvedValue(null);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(loginUser('nobody', 'bad')).rejects.toThrow('Invalid credentials');
    });

    it('throws when email not verified', async () => {
      vi.mocked(prisma.users.findFirst).mockResolvedValue({ ...mockUser, emailVerified: false } as never);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      await expect(loginUser('alice', 'pass')).rejects.toThrow('verify your email');
    });

    it('throws when not approved by admin', async () => {
      vi.mocked(prisma.users.findFirst).mockResolvedValue({ ...mockUser, approvedByAdmin: false } as never);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      await expect(loginUser('alice', 'pass')).rejects.toThrow('pending admin approval');
    });
  });

  describe('registerUser', () => {
    it('creates user and sends verification email', async () => {
      vi.mocked(prisma.users.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.users.create).mockResolvedValue({} as never);
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed' as never);
      vi.mocked(sendVerificationEmail).mockResolvedValue(undefined as never);

      await registerUser('Alice', 'Smith', 'a@b.com', 'alice', 'Strong1Pass');

      expect(prisma.users.create).toHaveBeenCalledOnce();
      expect(sendVerificationEmail).toHaveBeenCalledOnce();
    });

    it('silently succeeds when email already exists', async () => {
      vi.mocked(prisma.users.findFirst).mockResolvedValue({ userId: 1, email: 'a@b.com', username: 'other' } as never);
      vi.mocked(sendEmailAlreadyRegisteredEmail).mockResolvedValue(undefined as never);

      await registerUser('Alice', 'Smith', 'a@b.com', 'alice', 'Strong1Pass');

      expect(prisma.users.create).not.toHaveBeenCalled();
      expect(sendEmailAlreadyRegisteredEmail).toHaveBeenCalledWith('a@b.com');
    });

    it('throws when username already exists', async () => {
      vi.mocked(prisma.users.findFirst).mockResolvedValue({ userId: 1, email: 'other@b.com', username: 'alice' } as never);

      await expect(registerUser('Alice', 'Smith', 'a@b.com', 'alice', 'Strong1Pass'))
        .rejects.toThrow('Username already exists');
    });
  });

  describe('requestPasswordReset', () => {
    it('sends reset email when user exists', async () => {
      vi.mocked(prisma.users.findUnique).mockResolvedValue({ userId: 1, email: 'a@b.com' } as never);
      vi.mocked(prisma.users.update).mockResolvedValue({} as never);
      vi.mocked(sendPasswordResetEmail).mockResolvedValue(undefined as never);

      await requestPasswordReset('a@b.com');

      expect(prisma.users.update).toHaveBeenCalledOnce();
      expect(sendPasswordResetEmail).toHaveBeenCalledOnce();
    });

    it('silently no-ops when user not found', async () => {
      vi.mocked(prisma.users.findUnique).mockResolvedValue(null);

      await requestPasswordReset('nobody@test.com');

      expect(prisma.users.update).not.toHaveBeenCalled();
      expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('updates password with valid token', async () => {
      vi.mocked(prisma.users.findFirst).mockResolvedValue({
        userId: 1, passwordResetExpiresAt: new Date(Date.now() + 60_000),
      } as never);
      vi.mocked(bcrypt.hash).mockResolvedValue('newHashed' as never);
      vi.mocked(prisma.users.update).mockResolvedValue({} as never);

      await resetPassword('raw-token', 'NewPass1');

      expect(prisma.users.update).toHaveBeenCalledOnce();
      expect(bcrypt.hash).toHaveBeenCalledWith('NewPass1', 12);
    });

    it('throws on expired token', async () => {
      vi.mocked(prisma.users.findFirst).mockResolvedValue({
        userId: 1, passwordResetExpiresAt: new Date(Date.now() - 60_000),
      } as never);

      await expect(resetPassword('expired', 'NewPass1')).rejects.toThrow('expired');
    });

    it('throws when token not found', async () => {
      vi.mocked(prisma.users.findFirst).mockResolvedValue(null);
      await expect(resetPassword('bad', 'NewPass1')).rejects.toThrow('Invalid or expired');
    });
  });

  describe('verifyUserEmail', () => {
    it('verifies email with valid token', async () => {
      vi.mocked(prisma.users.findFirst)
        .mockResolvedValueOnce({ userId: 1, username: 'alice', email: 'a@b.com', emailVerifyExpiresAt: new Date(Date.now() + 60_000) } as never);
      vi.mocked(prisma.users.findMany).mockResolvedValue([{ email: 'admin@test.com' }] as never);
      vi.mocked(prisma.users.update).mockResolvedValue({} as never);

      const result = await verifyUserEmail('valid-token');

      expect(result.username).toBe('alice');
      expect(result.adminEmails).toEqual(['admin@test.com']);
      expect(prisma.users.update).toHaveBeenCalledWith({
        where: { userId: 1 },
        data: { emailVerified: true, emailVerifyToken: null, emailVerifyExpiresAt: null },
      });
    });

    it('throws on invalid token', async () => {
      vi.mocked(prisma.users.findFirst).mockResolvedValue(null);
      await expect(verifyUserEmail('bad')).rejects.toThrow('Invalid email verification token');
    });

    it('throws on expired token', async () => {
      vi.mocked(prisma.users.findFirst).mockResolvedValue({
        userId: 1, username: 'alice', email: 'a@b.com', emailVerifyExpiresAt: new Date(Date.now() - 60_000),
      } as never);
      await expect(verifyUserEmail('expired')).rejects.toThrow('expired');
    });
  });

  describe('verifyToken', () => {
    it('returns decoded payload for a valid token', async () => {
      const { SignJWT } = await import('jose');
      const secret = new TextEncoder().encode(process.env.KEY_ENCRYPTION);
      const token = await new SignJWT({
        userId: 'user-1',
        username: 'alice',
        role: 'USER',
        approvedByAdmin: true,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(secret);

      const payload = await verifyToken(token);

      expect(payload).not.toBeNull();
      expect(payload!.userId).toBe('user-1');
      expect(payload!.username).toBe('alice');
      expect(payload!.role).toBe('USER');
      expect(payload!.approvedByAdmin).toBe(true);
      expect(typeof payload!.iat).toBe('number');
      expect(typeof payload!.exp).toBe('number');
    });

    it('returns null for an invalid token', async () => {
      const result = await verifyToken('not-a-real-jwt');
      expect(result).toBeNull();
    });

    it('returns null for a token signed with a different key', async () => {
      const { SignJWT } = await import('jose');
      const wrongSecret = new TextEncoder().encode('b'.repeat(64));
      const token = await new SignJWT({
        userId: 'user-1',
        username: 'alice',
        role: 'USER',
        approvedByAdmin: true,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1h')
        .sign(wrongSecret);

      const result = await verifyToken(token);
      expect(result).toBeNull();
    });

    it('throws when KEY_ENCRYPTION is not defined', async () => {
      delete process.env.KEY_ENCRYPTION;

      await expect(verifyToken('some-token')).rejects.toThrow('KEY_ENCRYPTION is not defined');
    });
  });

  describe('refreshVerificationEmail', () => {
    it('returns silently when user not found', async () => {
      vi.mocked(prisma.users.findUnique).mockResolvedValue(null);

      await refreshVerificationEmail('nobody@test.com');

      expect(prisma.users.update).not.toHaveBeenCalled();
      expect(sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('returns silently when user is already verified', async () => {
      vi.mocked(prisma.users.findUnique).mockResolvedValue({
        userId: 1, email: 'a@b.com', emailVerified: true,
      } as never);

      await refreshVerificationEmail('a@b.com');

      expect(prisma.users.update).not.toHaveBeenCalled();
      expect(sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('updates token and sends email for unverified user', async () => {
      vi.mocked(prisma.users.findUnique).mockResolvedValue({
        userId: 1, email: 'a@b.com', emailVerified: false,
      } as never);
      vi.mocked(prisma.users.update).mockResolvedValue({} as never);
      vi.mocked(sendVerificationEmail).mockResolvedValue(undefined as never);

      await refreshVerificationEmail('a@b.com');

      expect(prisma.users.update).toHaveBeenCalledOnce();
      expect(prisma.users.update).toHaveBeenCalledWith({
        where: { userId: 1 },
        data: {
          emailVerifyToken: expect.any(String),
          emailVerifyExpiresAt: expect.any(Date),
        },
      });
      expect(sendVerificationEmail).toHaveBeenCalledWith('a@b.com', expect.any(String));
    });
  });
});
