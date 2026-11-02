import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/about/about.service', () => ({
  updateAbout: vi.fn(),
  deleteAbout: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { PATCH, DELETE } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { updateAbout, deleteAbout } from '@/modules/about/about.service';

describe('/api/about/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('PATCH', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      vi.mocked(enforceRouteAuth).mockResolvedValue(NextResponse.json({ message: 'Forbidden' }, { status: 403 } as never) as never);

      const response = await PATCH(new Request('http://localhost', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }), {
        params: Promise.resolve({ id: '1' }) as Promise<{ id: string }>,
      });

      expect(response.status).toBe(403);
    });

    it('returns 500 on error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);
      vi.mocked(updateAbout).mockRejectedValue(new Error('DB error'));

      const response = await PATCH(new Request('http://localhost', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Test' }),
      }), {
        params: Promise.resolve({ id: '1' }) as Promise<{ id: string }>,
      });

      expect(response.status).toBe(500);
    });
  });

  describe('DELETE', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      vi.mocked(enforceRouteAuth).mockResolvedValue(NextResponse.json({ message: 'Forbidden' }, { status: 403 } as never) as never);

      const response = await DELETE(new Request('http://localhost', { method: 'DELETE' }), {
        params: Promise.resolve({ id: '1' }) as Promise<{ id: string }>,
      });

      expect(response.status).toBe(403);
    });

    it('returns 204 on success', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);
      vi.mocked(deleteAbout).mockResolvedValue(undefined as never);

      const response = await DELETE(new Request('http://localhost', { method: 'DELETE' }), {
        params: Promise.resolve({ id: '1' }) as Promise<{ id: string }>,
      });

      expect(response.status).toBe(204);
    });

    it('returns 500 on error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true } as never);
      vi.mocked(deleteAbout).mockRejectedValue(new Error('DB error'));

      const response = await DELETE(new Request('http://localhost', { method: 'DELETE' }), {
        params: Promise.resolve({ id: '1' }) as Promise<{ id: string }>,
      });

      expect(response.status).toBe(500);
    });
  });
});
