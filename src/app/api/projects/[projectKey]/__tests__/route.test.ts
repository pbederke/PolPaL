import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/projects/projects.service', () => ({
  getProjectInfos: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
}));
vi.mock('@/modules/projects/projects.schema', async () => {
  const z = await import('zod');
  return {
    ProjectUpdateSchema: z.default.object({
      projectKey: z.default.string().min(1).optional(),
      projectNameShort: z.default.string().min(1).optional(),
      projectName: z.default.string().min(1).optional(),
      projectUrl: z.default.string().optional().nullable(),
      projectDescription: z.default.string().optional().nullable(),
      isHidden: z.default.boolean().optional(),
      isHiddenReason: z.default.string().optional().nullable(),
      comment: z.default.string().optional().nullable(),
    }),
  };
});
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { GET, PUT, DELETE } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getProjectInfos, updateProject, deleteProject } from '@/modules/projects/projects.service';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

const mockParams = (key: string) => ({
  params: Promise.resolve({ projectKey: key }) as Promise<{ projectKey: string }>,
});

describe('/api/projects/[projectKey] route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 200 with project', async () => {
      const project = { projectKey: 'proj1', projectNameShort: 'Proj 1' };
      vi.mocked(getProjectInfos).mockResolvedValue(project as never);

      const response = await GET(
        new Request('http://localhost/api/projects/proj1'),
        mockParams('proj1'),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(project);
    });

    it('returns 404 when not found', async () => {
      vi.mocked(getProjectInfos).mockResolvedValue(null);

      const response = await GET(
        new Request('http://localhost/api/projects/missing'),
        mockParams('missing'),
      );
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Project not found');
    });

    it('returns 500 on error', async () => {
      vi.mocked(getProjectInfos).mockRejectedValue(new Error('DB error'));

      const response = await GET(
        new Request('http://localhost/api/projects/proj1'),
        mockParams('proj1'),
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
        new Request('http://localhost/api/projects/proj1', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({}),
        }),
        mockParams('proj1'),
      );
      expect(response.status).toBe(401);
    });

    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      const forbiddenResponse = NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      vi.mocked(enforceRouteAuth).mockResolvedValue(forbiddenResponse as never);

      const response = await PUT(
        new Request('http://localhost/api/projects/proj1', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({}),
        }),
        mockParams('proj1'),
      );
      expect(response.status).toBe(403);
    });

    it('returns 400 on invalid body', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await PUT(
        new Request('http://localhost/api/projects/proj1', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ projectKey: 123 }),
        }),
        mockParams('proj1'),
      );
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Invalid request body');
    });

    it('returns 200 on success', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const updated = { projectKey: 'proj1', projectNameShort: 'Updated' };
      vi.mocked(updateProject).mockResolvedValue(updated as never);

      const response = await PUT(
        new Request('http://localhost/api/projects/proj1', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ projectNameShort: 'Updated' }),
        }),
        mockParams('proj1'),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(updated);
    });

    it('returns 500 on error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(updateProject).mockRejectedValue(new Error('DB error'));

      const response = await PUT(
        new Request('http://localhost/api/projects/proj1', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ projectNameShort: 'Updated' }),
        }),
        mockParams('proj1'),
      );
      expect(response.status).toBe(500);
    });
  });

  describe('DELETE', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(null);

      const response = await DELETE(
        new Request('http://localhost/api/projects/proj1', { method: 'DELETE' }),
        mockParams('proj1'),
      );
      expect(response.status).toBe(401);
    });

    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      const forbiddenResponse = NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      vi.mocked(enforceRouteAuth).mockResolvedValue(forbiddenResponse as never);

      const response = await DELETE(
        new Request('http://localhost/api/projects/proj1', { method: 'DELETE' }),
        mockParams('proj1'),
      );
      expect(response.status).toBe(403);
    });

    it('returns 204 on success', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteProject).mockResolvedValue(undefined as never);

      const response = await DELETE(
        new Request('http://localhost/api/projects/proj1', { method: 'DELETE' }),
        mockParams('proj1'),
      );
      expect(response.status).toBe(204);
    });

    it('returns 500 on error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteProject).mockRejectedValue(new Error('DB error'));

      const response = await DELETE(
        new Request('http://localhost/api/projects/proj1', { method: 'DELETE' }),
        mockParams('proj1'),
      );
      expect(response.status).toBe(500);
    });
  });
});
