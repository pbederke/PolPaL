import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/admin/admin.service', () => ({
  deleteEntityInCountriesAdmin: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { DELETE } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { deleteEntityInCountriesAdmin } from '@/modules/admin/admin.service';

const ADMIN_AUTH = { userId: 1, username: 'admin', role: 'ADMIN', approvedByAdmin: true };

function makeRequest(body?: unknown) {
  return new Request('http://localhost/api/admin/entities-in-countries/1', {
    method: 'DELETE',
    headers: body !== undefined ? { 'content-type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe('/api/admin/entities-in-countries/[entityInCountryId] route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('DELETE', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      vi.mocked(enforceRouteAuth).mockResolvedValue(NextResponse.json({ message: 'Forbidden' }, { status: 403 } as never) as never,
      );

      const response = await DELETE(makeRequest(), { params: Promise.resolve({ entityInCountryId: '1' }) });
      expect(response.status).toBe(403);
    });

    it('returns 400 for invalid id', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await DELETE(makeRequest(), { params: Promise.resolve({ entityInCountryId: 'abc' }) });
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe('Invalid ID');
    });

    it('returns 400 for negative id', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await DELETE(makeRequest(), { params: Promise.resolve({ entityInCountryId: '-2' }) });
      expect(response.status).toBe(400);
    });

    it('returns 204 on success without body', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteEntityInCountriesAdmin).mockResolvedValue(undefined as never);

      const response = await DELETE(makeRequest(), { params: Promise.resolve({ entityInCountryId: '3' }) });
      expect(response.status).toBe(204);
      expect(deleteEntityInCountriesAdmin).toHaveBeenCalledWith(3, 1, undefined);
    });

    it('returns 204 on success with comment', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteEntityInCountriesAdmin).mockResolvedValue(undefined as never);

      const response = await DELETE(makeRequest({ comment: 'wrong mapping' }), { params: Promise.resolve({ entityInCountryId: '3' }) });
      expect(response.status).toBe(204);
      expect(deleteEntityInCountriesAdmin).toHaveBeenCalledWith(3, 1, 'wrong mapping');
    });

    it('trims and ignores empty comment', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteEntityInCountriesAdmin).mockResolvedValue(undefined as never);

      await DELETE(makeRequest({ comment: '   ' }), { params: Promise.resolve({ entityInCountryId: '3' }) });
      expect(deleteEntityInCountriesAdmin).toHaveBeenCalledWith(3, 1, undefined);
    });

    it('truncates long comment to 1000 chars', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteEntityInCountriesAdmin).mockResolvedValue(undefined as never);
      const longComment = 'x'.repeat(1500);

      await DELETE(makeRequest({ comment: longComment }), { params: Promise.resolve({ entityInCountryId: '3' }) });
      const call = vi.mocked(deleteEntityInCountriesAdmin).mock.calls[0];
      expect((call[2] as string).length).toBe(1000);
    });

    it('returns 409 on foreign key constraint', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const err = new Error('FK') as Error & { code: string };
      err.code = 'P2003';
      vi.mocked(deleteEntityInCountriesAdmin).mockRejectedValue(err);

      const response = await DELETE(makeRequest(), { params: Promise.resolve({ entityInCountryId: '1' }) });
      expect(response.status).toBe(409);
    });

    it('returns 404 on not found', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const err = new Error('nf') as Error & { code: string };
      err.code = 'P2025';
      vi.mocked(deleteEntityInCountriesAdmin).mockRejectedValue(err);

      const response = await DELETE(makeRequest(), { params: Promise.resolve({ entityInCountryId: '999' }) });
      expect(response.status).toBe(404);
    });

    it('returns 500 on unknown error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteEntityInCountriesAdmin).mockRejectedValue(new Error('boom'));

      const response = await DELETE(makeRequest(), { params: Promise.resolve({ entityInCountryId: '1' }) });
      expect(response.status).toBe(500);
    });
  });
});
