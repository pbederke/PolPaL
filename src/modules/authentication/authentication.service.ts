import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { prisma } from '@/lib/server/prisma.server';
import { sendVerificationEmail, sendEmailAlreadyRegisteredEmail, sendPasswordResetEmail } from '@/lib/server/email.server';
import logger from '@/lib/server/logger.server';

// Pre-computed dummy bcrypt hash used to keep login response time constant
// regardless of whether the identifier matches an existing account. Without
// this, skipping bcrypt.compare for unknown users creates a timing oracle that
// allows an attacker to enumerate valid usernames by measuring response latency.
// The hash is intentionally never valid for any real password.
const DUMMY_HASH = bcrypt.hashSync('polpal-dummy-constant-time', 12);

// Registration function: creates the user, sends verification email. No JWT issued until email is verified.
export async function registerUser(nameFirst: string, nameLast: string, email: string, username: string, password: string): Promise<void> {

  const existing = await prisma.users.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
  });
  if (existing) {
    if (existing.email === email) {
      // Silent success to prevent email enumeration — notify the existing account holder instead
      sendEmailAlreadyRegisteredEmail(email).catch((err) =>
        logger.warn({ err }, 'Failed to send already-registered notification'),
      );
      return;
    }
    if (existing.username === username) {
      throw new Error('Username already exists');
    }
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');

  await prisma.users.create({
    data: {
      nameFirst,
      nameLast,
      email,
      username,
      password: hashedPassword,
      emailVerifyToken: tokenHash,
      emailVerifyExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  sendVerificationEmail(email, rawToken).catch((err) =>
    logger.error({ err }, 'Failed to send verification email'),
  );
}

// Login function that accepts either email or username as identifier
export async function loginUser(identifier: string, password: string) {
  const user = await prisma.users.findFirst({
    where: {
      OR: [
        { email: identifier },
        { username: identifier },
      ],
    },
  });

  // Always run bcrypt.compare to prevent timing-based username enumeration.
  // When no user is found, compare against the dummy hash (always fails) so
  // that the response time is indistinguishable from a real failed login.
  const passwordValid = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);

  if (!user || !passwordValid) {
    throw new Error('Invalid credentials');
  }

  if (!user.emailVerified) {
    throw new Error('Please verify your email address before logging in.');
  }

  if (!user.approvedByAdmin) {
    throw new Error('Your account is pending admin approval.');
  }

  return await generateToken({
    userId: user.userId.toString(),
    username: user.username,
    role: user.role,
    approvedByAdmin: user.approvedByAdmin,
    tokenVersion: user.tokenVersion,
  });
}

async function generateToken(user: { userId: string; username: string; role: string; approvedByAdmin: boolean; tokenVersion: number }): Promise<string> {

  if (!process.env.KEY_ENCRYPTION) {
    throw new Error("KEY_ENCRYPTION is not defined");
  }

  return new SignJWT({
      userId: user.userId,
      username: user.username,
      role: user.role,
      approvedByAdmin: user.approvedByAdmin,
      tokenVersion: user.tokenVersion,
    })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('6h')
    .sign(new TextEncoder().encode(process.env.KEY_ENCRYPTION));
}

export async function verifyToken(token: string): Promise<{ userId: string; username: string; role: string; approvedByAdmin: boolean; iat: number; exp: number } | null> {

  if (!process.env.KEY_ENCRYPTION) {
    throw new Error("KEY_ENCRYPTION is not defined");
  }

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.KEY_ENCRYPTION), { algorithms: ['HS256'] });
    return payload as { userId: string; username: string; role: string; approvedByAdmin: boolean; iat: number; exp: number };
  } catch {
    return null;
  }
}

// Initiates a password reset: stores a hashed token and sends the email.
// Always returns silently to prevent email enumeration.
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.users.findUnique({ where: { email } });

  if (!user) {
    // Silent no-op — do not reveal whether the email exists
    return;
  }

  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');

  await prisma.users.update({
    where: { userId: user.userId },
    data: {
      passwordResetToken: tokenHash,
      passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  sendPasswordResetEmail(email, rawToken).catch((err) =>
    logger.error({ err }, 'Failed to send password reset email'),
  );
}

// Validates the reset token and updates the password.
export async function resetPassword(rawToken: string, newPassword: string): Promise<void> {
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');

  const user = await prisma.users.findFirst({
    where: { passwordResetToken: tokenHash },
  });

  if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
    throw new Error('Invalid or expired password reset token.');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.users.update({
    where: { userId: user.userId },
    data: {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
      tokenVersion: { increment: 1 }, // invalidate existing JWTs
    },
  });
}

// Verifies the user's email address via the raw token from the verification link.
// Marks the account as verified, then returns the user info and admin emails needed
// to fire the approval-request notification. Throws a tagged error for bad/expired tokens.
export async function verifyUserEmail(rawToken: string): Promise<{
  username: string;
  email: string;
  adminEmails: string[];
}> {
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');

  const user = await prisma.users.findFirst({
    where: { emailVerifyToken: tokenHash },
  });

  if (!user) {
    throw Object.assign(new Error('Invalid email verification token.'), { code: 'INVALID_TOKEN' });
  }

  if (user.emailVerifyExpiresAt && user.emailVerifyExpiresAt < new Date()) {
    throw Object.assign(new Error('Email verification token has expired.'), { code: 'EXPIRED_TOKEN' });
  }

  await prisma.users.update({
    where: { userId: user.userId },
    data: {
      emailVerified: true,
      emailVerifyToken: null,
      emailVerifyExpiresAt: null,
    },
  });

  const admins = await prisma.users.findMany({
    where: { role: 'ADMIN', approvedByAdmin: true },
    select: { email: true },
  });

  return {
    username: user.username,
    email: user.email,
    adminEmails: admins.map((a) => a.email),
  };
}

// Regenerates and sends a new verification email for the given address.
// Silently no-ops if the user is not found or already verified (prevents enumeration).
export async function refreshVerificationEmail(email: string): Promise<void> {
  const user = await prisma.users.findUnique({ where: { email } });

  if (!user || user.emailVerified) {
    return;
  }

  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');

  await prisma.users.update({
    where: { userId: user.userId },
    data: {
      emailVerifyToken: tokenHash,
      emailVerifyExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  sendVerificationEmail(user.email, rawToken).catch((err) =>
    logger.error({ err }, 'Failed to send verification email'),
  );
}