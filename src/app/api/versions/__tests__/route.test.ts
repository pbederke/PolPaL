import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/lib/server/auth.server', () => ({
  getAuthPayload: vi.fn(),
}));
vi.mock('@/modules/versions/versions.service', () => ({
  getVersions: vi.fn(),
  createVersion: vi.fn(),
}));
vi.mock('@/modules/versions/versions.schema', async () => {
  const z = await import('zod');
  return {
    VersionCreateSchema: z.default.object({
      versionKey: z.default.string().min(1),
      datasetKey: z.default.string().min(1),
      projectKey: z.default.string().min(1),
      version: z.default.string().min(1),
      versionUrl: z.default.string().min(1),
      versionCitation: z.default.array(z.default.string().min(1)),
      versionName: z.default.string().optional().nullable(),
      shownOnWebsite: z.default.boolean().optional(),
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

import { GET, POST } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getAuthPayload } from '@/lib/server/auth.server';
import { getVersions, createVersion } from '@/modules/versions/versions.service';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

describe('/api/versions route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 200 with all versions for authenticated user', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(null as never);
      const versions = [
        { versionKey: 'v1', isHidden: false, datasetIsHidden: false, projectIsHidden: false },
        { versionKey: 'v2', isHidden: true, datasetIsHidden: false, projectIsHidden: false },
      ];
      vi.mocked(getAuthPayload).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(getVersions).mockResolvedValue(versions as never);

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(versions);
    });

    it('filters hidden items for unauthenticated user', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(null as never);
      const versions = [
        { versionKey: 'v1', versionIsHidden: false, datasetIsHidden: false, projectIsHidden: false },
        { versionKey: 'v2', versionIsHidden: true, datasetIsHidden: false, projectIsHidden: false },
        { versionKey: 'v3', versionIsHidden: false, datasetIsHidden: true, projectIsHidden: false },
        { versionKey: 'v4', versionIsHidden: false, datasetIsHidden: false, projectIsHidden: true },
      ];
      vi.mocked(getAuthPayload).mockResolvedValue(null);
      vi.mocked(getVersions).mockResolvedValue(versions as never);

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toHaveLength(1);
      expect(body[0].versionKey).toBe('v1');
    });

    it('returns 500 on error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(null as never);
      vi.mocked(getAuthPayload).mockResolvedValue(null);
      vi.mocked(getVersions).mockRejectedValue(new Error('DB error'));

      const response = await GET();
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Internal server error');
    });
  });

  describe('POST', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(null);

      const request = new Request('http://localhost/api/versions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      const forbiddenResponse = NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      vi.mocked(enforceRouteAuth).mockResolvedValue(forbiddenResponse as never);

      const request = new Request('http://localhost/api/versions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it('returns 400 on invalid body', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const request = new Request('http://localhost/api/versions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ invalid: 'data' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Invalid request body');
    });

    it('returns 201 on success', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const created = { versionKey: 'v1', datasetKey: 'ds1', projectKey: 'proj1' };
      vi.mocked(createVersion).mockResolvedValue(created as never);

      const request = new Request('http://localhost/api/versions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          versionKey: 'v1',
          datasetKey: 'ds1',
          projectKey: 'proj1',
          version: '1.0',
          versionUrl: 'https://example.com',
          versionCitation: ['Citation 1'],
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body).toEqual(created);
    });

    it('returns 500 on error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(createVersion).mockRejectedValue(new Error('DB error'));

      const request = new Request('http://localhost/api/versions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          versionKey: 'v1',
          datasetKey: 'ds1',
          projectKey: 'proj1',
          version: '1.0',
          versionUrl: 'https://example.com',
          versionCitation: ['Citation 1'],
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Internal server error');
    });
  });
});
