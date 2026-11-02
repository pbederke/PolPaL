import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { POST } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';

describe('/api/authentication/logout route', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 when auth fails', async () => {
    const { NextResponse } = await import('next/server');
    vi.mocked(enforceRouteAuth).mockResolvedValue(
      NextResponse.json({ message: 'Forbidden' }, { status: 403 }) as never
    );

    const response = await POST();
    expect(response.status).toBe(403);
  });

  it('returns 200 and clears cookie', async () => {
    vi.mocked(enforceRouteAuth).mockResolvedValue({
      userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true,
    } as never);

    const response = await POST();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('message', 'Logged out successfully');

    const cookie = response.headers.get('set-cookie');
    expect(cookie).toContain('polpal_token=');
    expect(cookie).toContain('Max-Age=0');
  });
});
