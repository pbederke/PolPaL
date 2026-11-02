import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/lib/server/auth.server', () => ({
  getAuthPayload: vi.fn(),
}));
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined as never),
  }),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { GET } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getAuthPayload } from '@/lib/server/auth.server';

describe('/api/authentication/status route', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    vi.mocked(enforceRouteAuth).mockResolvedValue({
      userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true,
    } as never);
    vi.mocked(getAuthPayload).mockResolvedValue(null);

    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toHaveProperty('loggedIn', false);
  });

  it('returns 200 with user info when authenticated', async () => {
    vi.mocked(enforceRouteAuth).mockResolvedValue({
      userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true,
    } as never);
    vi.mocked(getAuthPayload).mockResolvedValue({
      userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true,
    } as never);

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      loggedIn: true,
      userId: 1,
      username: 'admin',
      approvedByAdmin: true,
      role: 'ADMIN',
    });
  });
});
