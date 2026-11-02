import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/variables/variables.service', () => ({
  getVariablesForVersion: vi.fn(),
  getAvailableVars: vi.fn(),
  createVariable: vi.fn(),
  deleteVariable: vi.fn(),
}));
vi.mock('@/modules/variables/variables.schema', async () => {
  const z = await import('zod');
  return {
    VariableCreateSchema: z.default.object({
      entryEntityIdVar: z.default.string().min(1),
      varTitle: z.default.string().min(1),
      varContent: z.default.string().min(1),
    }),
  };
});
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { GET, POST, DELETE } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import {
  getVariablesForVersion,
  getAvailableVars,
  createVariable,
  deleteVariable,
} from '@/modules/variables/variables.service';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

const mockParams = (key: string) => ({
  params: Promise.resolve({ versionKey: key }) as Promise<{ versionKey: string }>,
});

describe('/api/variables/[versionKey] route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 200 with variables and available vars', async () => {
      const variables = [{ id: 1, varTitle: 'Test' }];
      const availableVars = ['var1', 'var2'];
      vi.mocked(getVariablesForVersion).mockResolvedValue(variables as never);
      vi.mocked(getAvailableVars).mockResolvedValue(availableVars as never);

      const response = await GET(
        new Request('http://localhost/api/variables/v1'),
        mockParams('v1'),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({ variables, availableVars });
    });

    it('returns 500 on error', async () => {
      vi.mocked(getVariablesForVersion).mockRejectedValue(new Error('DB error'));

      const response = await GET(
        new Request('http://localhost/api/variables/v1'),
        mockParams('v1'),
      );
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Internal server error');
    });
  });

  describe('POST', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      const forbiddenResponse = NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      vi.mocked(enforceRouteAuth).mockResolvedValue(forbiddenResponse as never);

      const request = new Request('http://localhost/api/variables/v1', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await POST(request, mockParams('v1'));
      expect(response.status).toBe(403);
    });

    it('returns 401 when auth is null', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(null);

      const request = new Request('http://localhost/api/variables/v1', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await POST(request, mockParams('v1'));
      expect(response.status).toBe(401);
    });

    it('returns 400 on invalid body', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const request = new Request('http://localhost/api/variables/v1', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ invalid: 'data' }),
      });

      const response = await POST(request, mockParams('v1'));
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Invalid request body');
    });

    it('returns 201 on success', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const created = { id: 1, entryEntityIdVar: 'var1', varTitle: 'Test', varContent: 'Content' };
      vi.mocked(createVariable).mockResolvedValue(created as never);

      const request = new Request('http://localhost/api/variables/v1', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ entryEntityIdVar: 'var1', varTitle: 'Test', varContent: 'Content' }),
      });

      const response = await POST(request, mockParams('v1'));
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body).toEqual(created);
    });

    it('returns 409 when variable already exists', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(createVariable).mockRejectedValue(new Error('already exists'));

      const request = new Request('http://localhost/api/variables/v1', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ entryEntityIdVar: 'var1', varTitle: 'Test', varContent: 'Content' }),
      });

      const response = await POST(request, mockParams('v1'));
      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Variable already exists for this version.');
    });

    it('returns 500 on service error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(createVariable).mockRejectedValue(new Error('DB error'));

      const request = new Request('http://localhost/api/variables/v1', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ entryEntityIdVar: 'var1', varTitle: 'Test', varContent: 'Content' }),
      });

      const response = await POST(request, mockParams('v1'));
      expect(response.status).toBe(500);
    });
  });

  describe('DELETE', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      const forbiddenResponse = NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      vi.mocked(enforceRouteAuth).mockResolvedValue(forbiddenResponse as never);

      const request = new Request('http://localhost/api/variables/v1', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ variableId: 1 }),
      });

      const response = await DELETE(request, mockParams('v1'));
      expect(response.status).toBe(403);
    });

    it('returns 401 when auth is null', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(null);

      const request = new Request('http://localhost/api/variables/v1', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ variableId: 1 }),
      });

      const response = await DELETE(request, mockParams('v1'));
      expect(response.status).toBe(401);
    });

    it('returns 400 when variableId is missing', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const request = new Request('http://localhost/api/variables/v1', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await DELETE(request, mockParams('v1'));
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'variableId must be a positive integer');
    });

    it('returns 400 for non-positive variableId', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const request = new Request('http://localhost/api/variables/v1', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ variableId: 0 }),
      });

      const response = await DELETE(request, mockParams('v1'));
      expect(response.status).toBe(400);
    });

    it('returns 204 on success', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteVariable).mockResolvedValue(undefined as never);

      const request = new Request('http://localhost/api/variables/v1', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ variableId: 1 }),
      });

      const response = await DELETE(request, mockParams('v1'));
      expect(response.status).toBe(204);
    });

    it('returns 204 with comment', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteVariable).mockResolvedValue(undefined as never);

      const request = new Request('http://localhost/api/variables/v1', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ variableId: 1, comment: 'test comment' }),
      });

      const response = await DELETE(request, mockParams('v1'));
      expect(response.status).toBe(204);
      expect(deleteVariable).toHaveBeenCalledWith(1, 1, 'test comment');
    });

    it('returns 404 when variable not found', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteVariable).mockRejectedValue(new Error('not found'));

      const request = new Request('http://localhost/api/variables/v1', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ variableId: 999 }),
      });

      const response = await DELETE(request, mockParams('v1'));
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Variable not found.');
    });

    it('returns 500 on service error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteVariable).mockRejectedValue(new Error('DB error'));

      const request = new Request('http://localhost/api/variables/v1', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ variableId: 1 }),
      });

      const response = await DELETE(request, mockParams('v1'));
      expect(response.status).toBe(500);
    });
  });
});
