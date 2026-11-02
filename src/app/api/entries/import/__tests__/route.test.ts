import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ZodError } from 'zod';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/entries/entries.service', () => ({
  importEntriesStreaming: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { POST } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { importEntriesStreaming } from '@/modules/entries/entries.service';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/entries/import', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/entries/import route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('POST', () => {
    it('returns 403 when auth fails', async () => {
      const { NextResponse } = await import('next/server');
      vi.mocked(enforceRouteAuth).mockResolvedValue(
        NextResponse.json({ message: 'Forbidden' }, { status: 403 } as never) as never,
      );

      const response = await POST(makeRequest([{ key: 'value' }]));
      expect(response.status).toBe(403);
    });

    it('returns 400 when body is not an array', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await POST(makeRequest({ not: 'an array' }));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toHaveProperty('message', 'Request body must be an array');
    });

    it('returns 400 when service throws a ZodError (invalid row in chunk)', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(importEntriesStreaming).mockRejectedValue(
        new ZodError([{ code: 'invalid_type', expected: 'string', received: 'undefined', path: ['countrycodePolpal'], message: 'Required' }])
      );

      const response = await POST(makeRequest([{ title: 123 }]));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toHaveProperty('message', 'Invalid request body');
    });

    it('returns 201 on successful import', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(importEntriesStreaming).mockResolvedValue({
        totalCreated: 5,
        batchId: 'batch-123',
      } as never);

      const response = await POST(makeRequest([{ title: 'Test' }]));
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body).toEqual({
        success: true,
        message: 'Entries imported successfully',
        createdCount: 5,
        batchId: 'batch-123',
      });
      expect(importEntriesStreaming).toHaveBeenCalledWith(1, [{ title: 'Test' }]);
    });

    it('returns 201 with empty array', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(importEntriesStreaming).mockResolvedValue({
        totalCreated: 0,
        batchId: 'batch-456',
      } as never);

      const response = await POST(makeRequest([]));
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.createdCount).toBe(0);
    });

    it('returns 500 on unexpected error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(importEntriesStreaming).mockRejectedValue(new Error('DB error'));

      const response = await POST(makeRequest([{ title: 'Test' }]));
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body).toHaveProperty('message', 'Internal server error');
    });
  });
});
