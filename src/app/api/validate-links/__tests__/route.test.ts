import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/validation/validation.service', () => ({
  upsertLinkValidation: vi.fn(),
  getLinkVerificationSummary: vi.fn(),
  deleteVerification: vi.fn(),
}));
vi.mock('@/modules/validation/validation.schema', async () => {
  const z = await import('zod');
  return {
    ValidateLinkSchema: z.default.object({
      linkId: z.default.number().int().positive(),
      validated: z.default.enum(['VALIDATED', 'NOT_VALIDATED', 'UNCLEAR']),
      comment: z.default.string().trim().max(1000).optional().nullable(),
    }),
    DeleteValidateLinkSchema: z.default.object({
      linkId: z.default.number().int().positive(),
    }),
  };
});
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { POST, GET, DELETE } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import {
  upsertLinkValidation,
  getLinkVerificationSummary,
  deleteVerification,
} from '@/modules/validation/validation.service';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

describe('/api/validate-links route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('POST', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      const forbiddenResponse = NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      vi.mocked(enforceRouteAuth).mockResolvedValue(forbiddenResponse as never);

      const request = new Request('http://localhost/api/validate-links', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it('returns 400 on invalid body', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const request = new Request('http://localhost/api/validate-links', {
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
      const result = { linkId: 1, validated: 'VALIDATED' };
      vi.mocked(upsertLinkValidation).mockResolvedValue(result as never);

      const request = new Request('http://localhost/api/validate-links', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ linkId: 1, validated: 'VALIDATED' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body).toEqual(result);
    });

    it('returns 404 when link not found', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(upsertLinkValidation).mockRejectedValue(new Error('Link not found'));

      const request = new Request('http://localhost/api/validate-links', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ linkId: 999, validated: 'VALIDATED' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(404);
    });

    it('returns 403 when cannot validate own link', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(upsertLinkValidation).mockRejectedValue(new Error('Cannot validate own link'));

      const request = new Request('http://localhost/api/validate-links', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ linkId: 1, validated: 'VALIDATED' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it('returns 500 on generic error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(upsertLinkValidation).mockRejectedValue(new Error('DB error'));

      const request = new Request('http://localhost/api/validate-links', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ linkId: 1, validated: 'VALIDATED' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
    });
  });

  describe('GET', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      const forbiddenResponse = NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      vi.mocked(enforceRouteAuth).mockResolvedValue(forbiddenResponse as never);

      const request = new Request('http://localhost/api/validate-links?linkId=1');
      const response = await GET(request);
      expect(response.status).toBe(403);
    });

    it('returns 400 when linkId missing', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const request = new Request('http://localhost/api/validate-links');
      const response = await GET(request);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Invalid linkId query parameter');
    });

    it('returns 400 for non-positive linkId', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const request = new Request('http://localhost/api/validate-links?linkId=0');
      const response = await GET(request);
      expect(response.status).toBe(400);
    });

    it('returns 200 with verification summary', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const summary = { linkId: 1, validations: [] };
      vi.mocked(getLinkVerificationSummary).mockResolvedValue(summary as never);

      const request = new Request('http://localhost/api/validate-links?linkId=1');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(summary);
    });

    it('returns 404 when link not found', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(getLinkVerificationSummary).mockRejectedValue(new Error('Link not found'));

      const request = new Request('http://localhost/api/validate-links?linkId=999');
      const response = await GET(request);
      expect(response.status).toBe(404);
    });

    it('returns 500 on generic error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(getLinkVerificationSummary).mockRejectedValue(new Error('DB error'));

      const request = new Request('http://localhost/api/validate-links?linkId=1');
      const response = await GET(request);
      expect(response.status).toBe(500);
    });
  });

  describe('DELETE', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      const forbiddenResponse = NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      vi.mocked(enforceRouteAuth).mockResolvedValue(forbiddenResponse as never);

      const request = new Request('http://localhost/api/validate-links', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await DELETE(request);
      expect(response.status).toBe(403);
    });

    it('returns 400 on invalid body', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const request = new Request('http://localhost/api/validate-links', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ invalid: 'data' }),
      });

      const response = await DELETE(request);
      expect(response.status).toBe(400);
    });

    it('returns 204 on success', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteVerification).mockResolvedValue(undefined as never);

      const request = new Request('http://localhost/api/validate-links', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ linkId: 1 }),
      });

      const response = await DELETE(request);
      expect(response.status).toBe(204);
      expect(deleteVerification).toHaveBeenCalledWith(1, 1);
    });

    it('returns 500 on error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteVerification).mockRejectedValue(new Error('DB error'));

      const request = new Request('http://localhost/api/validate-links', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ linkId: 1 }),
      });

      const response = await DELETE(request);
      expect(response.status).toBe(500);
    });
  });
});
