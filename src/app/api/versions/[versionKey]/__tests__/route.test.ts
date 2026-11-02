import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/versions/versions.service', () => ({
  getVersionInfos: vi.fn(),
  updateVersion: vi.fn(),
  deleteVersion: vi.fn(),
}));
vi.mock('@/modules/versions/versions.schema', async () => {
  const z = await import('zod');
  return {
    VersionUpdateSchema: z.default.object({
      version: z.default.string().min(1).optional(),
      versionName: z.default.string().optional().nullable(),
      versionUrl: z.default.string().min(1).optional(),
      versionCitation: z.default.array(z.default.string().min(1)).optional(),
      isHidden: z.default.boolean().optional(),
      isHiddenReason: z.default.string().optional().nullable(),
      commentVersion: z.default.string().optional().nullable(),
      commentEntries: z.default.string().optional().nullable(),
    }),
  };
});
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { GET, PUT, DELETE } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getVersionInfos, updateVersion, deleteVersion } from '@/modules/versions/versions.service';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

const mockParams = (key: string) => ({
  params: Promise.resolve({ versionKey: key }) as Promise<{ versionKey: string }>,
});

describe('/api/versions/[versionKey] route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 200 with version', async () => {
      const version = { versionKey: 'v1', version: '1.0' };
      vi.mocked(getVersionInfos).mockResolvedValue(version as never);

      const response = await GET(
        new Request('http://localhost/api/versions/v1'),
        mockParams('v1'),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(version);
    });

    it('returns 404 when not found', async () => {
      vi.mocked(getVersionInfos).mockResolvedValue(null);

      const response = await GET(
        new Request('http://localhost/api/versions/missing'),
        mockParams('missing'),
      );
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Version not found');
    });

    it('returns 500 on error', async () => {
      vi.mocked(getVersionInfos).mockRejectedValue(new Error('DB error'));

      const response = await GET(
        new Request('http://localhost/api/versions/v1'),
        mockParams('v1'),
      );
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Internal server error');
    });
  });

  describe('PUT', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(null);

      const response = await PUT(
        new Request('http://localhost/api/versions/v1', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({}),
        }),
        mockParams('v1'),
      );
      expect(response.status).toBe(401);
    });

    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      const forbiddenResponse = NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      vi.mocked(enforceRouteAuth).mockResolvedValue(forbiddenResponse as never);

      const response = await PUT(
        new Request('http://localhost/api/versions/v1', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({}),
        }),
        mockParams('v1'),
      );
      expect(response.status).toBe(403);
    });

    it('returns 400 on invalid body', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await PUT(
        new Request('http://localhost/api/versions/v1', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ version: 123 }),
        }),
        mockParams('v1'),
      );
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Invalid request body');
    });

    it('returns 200 on success', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const updated = { versionKey: 'v1', versionName: 'Updated' };
      vi.mocked(updateVersion).mockResolvedValue(updated as never);

      const response = await PUT(
        new Request('http://localhost/api/versions/v1', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ versionName: 'Updated' }),
        }),
        mockParams('v1'),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(updated);
    });

    it('returns 500 on error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(updateVersion).mockRejectedValue(new Error('DB error'));

      const response = await PUT(
        new Request('http://localhost/api/versions/v1', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ versionName: 'Updated' }),
        }),
        mockParams('v1'),
      );
      expect(response.status).toBe(500);
    });
  });

  describe('DELETE', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(null);

      const response = await DELETE(
        new Request('http://localhost/api/versions/v1', { method: 'DELETE' }),
        mockParams('v1'),
      );
      expect(response.status).toBe(401);
    });

    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      const forbiddenResponse = NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      vi.mocked(enforceRouteAuth).mockResolvedValue(forbiddenResponse as never);

      const response = await DELETE(
        new Request('http://localhost/api/versions/v1', { method: 'DELETE' }),
        mockParams('v1'),
      );
      expect(response.status).toBe(403);
    });

    it('returns 204 on success', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteVersion).mockResolvedValue(undefined as never);

      const response = await DELETE(
        new Request('http://localhost/api/versions/v1', { method: 'DELETE' }),
        mockParams('v1'),
      );
      expect(response.status).toBe(204);
    });

    it('returns 500 on error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteVersion).mockRejectedValue(new Error('DB error'));

      const response = await DELETE(
        new Request('http://localhost/api/versions/v1', { method: 'DELETE' }),
        mockParams('v1'),
      );
      expect(response.status).toBe(500);
    });
  });
});
