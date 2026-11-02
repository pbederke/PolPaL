import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/lib/server/auth.server', () => ({
  requireAuth: vi.fn(),
}));

import { enforceRouteAuth } from '../route-auth.server';
import { requireAuth } from '@/lib/server/auth.server';
import { ROUTES } from '@/app/api/routes.config';

describe('route-auth.server', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null for public routes', async () => {
    const result = await enforceRouteAuth('/api/about', 'GET');
    expect(result).toBeNull();
  });

  it('calls requireAuth for protected routes', async () => {
    const mockPayload = { userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true };
    vi.mocked(requireAuth).mockResolvedValue(mockPayload as never);

    const result = await enforceRouteAuth('/api/about', 'POST');
    expect(result).toEqual(mockPayload);
    expect(requireAuth).toHaveBeenCalledWith(['ADMIN', 'DATAMANAGER'], true);
  });

  it('returns 403 for unregistered routes', async () => {
    const result = await enforceRouteAuth('/api/nonexistent', 'GET');
    expect(result).toHaveProperty('status', 403);
  });

  it('returns requireAuth result when it returns a NextResponse (auth failure)', async () => {
    const authFailResponse = new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
    vi.mocked(requireAuth).mockResolvedValue(authFailResponse as never);

    const result = await enforceRouteAuth('/api/about', 'POST');
    expect(result).toBe(authFailResponse);
  });

  it('passes roles without approval requirement for routes with requiresApproval: false', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ userId: 1, username: 'u', role: 'USER', approvedByAdmin: true } as never);

    const publicUserRoute = ROUTES.find(r => r.path === '/api/news' && r.method === 'GET' && r.loggedIn);
    if (publicUserRoute) {
      await enforceRouteAuth(publicUserRoute.path, publicUserRoute.method);
      expect(requireAuth).toHaveBeenCalledWith(publicUserRoute.roles ?? undefined, publicUserRoute.requiresApproval);
    }
  });
});
