import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/datasets/datasets.service', () => ({
  getDatasetInfos: vi.fn(),
  updateDataset: vi.fn(),
  deleteDataset: vi.fn(),
}));
vi.mock('@/modules/datasets/datasets.schema', async () => {
  const z = await import('zod');
  return {
    DatasetUpdateSchema: z.default.object({
      datasetKey: z.default.string().min(1).optional(),
      projectKey: z.default.string().min(1).optional(),
      datasetNameShort: z.default.string().min(1).optional(),
      datasetName: z.default.string().min(1).optional(),
      datasetUrl: z.default.string().optional().nullable(),
      datasetDescription: z.default.string().optional().nullable(),
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
import { getDatasetInfos, updateDataset, deleteDataset } from '@/modules/datasets/datasets.service';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

const mockParams = (key: string) => ({
  params: Promise.resolve({ datasetKey: key }) as Promise<{ datasetKey: string }>,
});

describe('/api/datasets/[datasetKey] route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 200 with dataset', async () => {
      const dataset = { datasetKey: 'test-ds', datasetNameShort: 'Test DS' };
      vi.mocked(getDatasetInfos).mockResolvedValue(dataset as never);

      const response = await GET(
        new Request('http://localhost/api/datasets/test-ds'),
        mockParams('test-ds'),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(dataset);
    });

    it('returns 404 when not found', async () => {
      vi.mocked(getDatasetInfos).mockResolvedValue(null);

      const response = await GET(
        new Request('http://localhost/api/datasets/missing'),
        mockParams('missing'),
      );
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Dataset not found');
    });

    it('returns 500 on error', async () => {
      vi.mocked(getDatasetInfos).mockRejectedValue(new Error('DB error'));

      const response = await GET(
        new Request('http://localhost/api/datasets/test-ds'),
        mockParams('test-ds'),
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
        new Request('http://localhost/api/datasets/test-ds', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({}),
        }),
        mockParams('test-ds'),
      );
      expect(response.status).toBe(401);
    });

    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      const forbiddenResponse = NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      vi.mocked(enforceRouteAuth).mockResolvedValue(forbiddenResponse as never);

      const response = await PUT(
        new Request('http://localhost/api/datasets/test-ds', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({}),
        }),
        mockParams('test-ds'),
      );
      expect(response.status).toBe(403);
    });

    it('returns 400 on invalid body', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await PUT(
        new Request('http://localhost/api/datasets/test-ds', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ datasetKey: 123 }),
        }),
        mockParams('test-ds'),
      );
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Invalid request body');
    });

    it('returns 200 on success', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const updated = { datasetKey: 'test-ds', datasetNameShort: 'Updated' };
      vi.mocked(updateDataset).mockResolvedValue(updated as never);

      const response = await PUT(
        new Request('http://localhost/api/datasets/test-ds', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ datasetNameShort: 'Updated' }),
        }),
        mockParams('test-ds'),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(updated);
    });

    it('returns 500 on error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(updateDataset).mockRejectedValue(new Error('DB error'));

      const response = await PUT(
        new Request('http://localhost/api/datasets/test-ds', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ datasetNameShort: 'Updated' }),
        }),
        mockParams('test-ds'),
      );
      expect(response.status).toBe(500);
    });
  });

  describe('DELETE', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(null);

      const response = await DELETE(
        new Request('http://localhost/api/datasets/test-ds', { method: 'DELETE' }),
        mockParams('test-ds'),
      );
      expect(response.status).toBe(401);
    });

    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      const forbiddenResponse = NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      vi.mocked(enforceRouteAuth).mockResolvedValue(forbiddenResponse as never);

      const response = await DELETE(
        new Request('http://localhost/api/datasets/test-ds', { method: 'DELETE' }),
        mockParams('test-ds'),
      );
      expect(response.status).toBe(403);
    });

    it('returns 204 on success', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteDataset).mockResolvedValue(undefined as never);

      const response = await DELETE(
        new Request('http://localhost/api/datasets/test-ds', { method: 'DELETE' }),
        mockParams('test-ds'),
      );
      expect(response.status).toBe(204);
    });

    it('returns 500 on error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteDataset).mockRejectedValue(new Error('DB error'));

      const response = await DELETE(
        new Request('http://localhost/api/datasets/test-ds', { method: 'DELETE' }),
        mockParams('test-ds'),
      );
      expect(response.status).toBe(500);
    });
  });
});
