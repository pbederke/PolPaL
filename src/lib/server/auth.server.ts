import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { NextResponse } from 'next/server';
import logger from './logger.server';
import { logSecurityEvent } from './security-events.server';
import { prisma } from './prisma.server';

export interface AuthPayload {
  userId: number;
  username: string;
  role: string;
  approvedByAdmin: boolean;
}

export async function getAuthPayload(): Promise<AuthPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('polpal_token')?.value;
  if (!token) return null;

  try {
    if (!process.env.KEY_ENCRYPTION) return null;
    const { payload: decoded } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.KEY_ENCRYPTION),
      { algorithms: ['HS256'] }
    );

    // Verify token version against DB — ensures revoked tokens are rejected
    // and returns live role/approvedByAdmin values (not stale JWT claims)
    const user = await prisma.users.findUnique({
      where: { userId: Number(decoded.userId as string) },
      select: { tokenVersion: true, role: true, approvedByAdmin: true },
    });

    if (!user || user.tokenVersion !== (decoded.tokenVersion as number)) {
      logSecurityEvent('INVALID_TOKEN', { ip: 'server-side', userId: decoded.userId, reason: 'token_revoked' });
      return null;
    }

    return {
      userId: Number(decoded.userId as string),
      username: decoded.username as string,
      role: user.role,
      approvedByAdmin: user.approvedByAdmin,
    };
  } catch {
    logSecurityEvent('INVALID_TOKEN', { ip: 'server-side' });
    return null;
  }
}

export async function requireAuth(
  roles?: string[],
  requireApprovedByAdmin = true
): Promise<AuthPayload | NextResponse> {
  const payload = await getAuthPayload();

  if (!payload) {
    logger.warn({ securityEvent: 'PERMISSION_DENIED', reason: 'unauthenticated' }, '[SECURITY] PERMISSION_DENIED — no valid token');
    return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
  }

  if (roles && !roles.includes(payload.role)) {
    logSecurityEvent('PERMISSION_DENIED', {
      ip: 'server-side',
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
      requiredRoles: roles,
      reason: 'insufficient_role',
    });
    return NextResponse.json({ message: 'Forbidden: insufficient role' }, { status: 403 });
  }

  if (requireApprovedByAdmin && !payload.approvedByAdmin) {
    logSecurityEvent('PERMISSION_DENIED', {
      ip: 'server-side',
      userId: payload.userId,
      username: payload.username,
      reason: 'not_approved_by_admin',
    });
    return NextResponse.json({ message: 'Forbidden: user not approved by admin' }, { status: 403 });
  }

  return payload;
}
