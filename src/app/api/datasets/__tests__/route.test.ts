import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/datasets/datasets.service', () => ({
  createDataset: vi.fn(),
}));
vi.mock('@/modules/datasets/datasets.schema', async () => {
  const z = await import('zod');
  return {
    DatasetCreateSchema: z.default.object({
      datasetKey: z.default.string().min(1),
      projectKey: z.default.string().min(1),
      datasetNameShort: z.default.string().min(1),
      datasetName: z.default.string().min(1),
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

import { POST } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { createDataset } from '@/modules/datasets/datasets.service';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

describe('/api/datasets route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('POST', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(null);

      const request = new Request('http://localhost/api/datasets', {
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

      const request = new Request('http://localhost/api/datasets', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it('returns 400 on invalid body', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const request = new Request('http://localhost/api/datasets', {
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
      const created = { datasetKey: 'test-ds', projectKey: 'test-proj', datasetNameShort: 'Test DS' };
      vi.mocked(createDataset).mockResolvedValue(created as never);

      const request = new Request('http://localhost/api/datasets', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          datasetKey: 'test-ds',
          projectKey: 'test-proj',
          datasetNameShort: 'Test DS',
          datasetName: 'Test Dataset',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body).toEqual(created);
    });

    it('returns 500 on error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(createDataset).mockRejectedValue(new Error('DB error'));

      const request = new Request('http://localhost/api/datasets', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          datasetKey: 'test-ds',
          projectKey: 'test-proj',
          datasetNameShort: 'Test DS',
          datasetName: 'Test Dataset',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Internal server error');
    });
  });
});
