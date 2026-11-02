import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/report-tickets/report-tickets.service', () => ({
  deleteTicket: vi.fn(),
  updateTicketStatus: vi.fn(),
}));
vi.mock('@/modules/report-tickets/report-tickets.schema', async () => {
  const z = await import('zod');
  return {
    ReportTicketStatusUpdateSchema: z.default.object({
      status: z.default.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
    }),
  };
});
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { DELETE, PATCH } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { deleteTicket, updateTicketStatus } from '@/modules/report-tickets/report-tickets.service';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

const mockParams = (id: string) => ({
  params: Promise.resolve({ ticketId: id }) as Promise<{ ticketId: string }>,
});

describe('/api/report-tickets/[ticketId] route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('DELETE', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      const forbiddenResponse = NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      vi.mocked(enforceRouteAuth).mockResolvedValue(forbiddenResponse as never);

      const response = await DELETE(
        new Request('http://localhost/api/report-tickets/1', { method: 'DELETE' }),
        mockParams('1'),
      );
      expect(response.status).toBe(403);
    });

    it('returns 400 for invalid ID', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await DELETE(
        new Request('http://localhost/api/report-tickets/0', { method: 'DELETE' }),
        mockParams('0'),
      );
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Invalid ticket ID');
    });

    it('returns 400 for non-integer ID', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await DELETE(
        new Request('http://localhost/api/report-tickets/abc', { method: 'DELETE' }),
        mockParams('abc'),
      );
      expect(response.status).toBe(400);
    });

    it('returns 204 on success', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteTicket).mockResolvedValue(undefined as never);

      const response = await DELETE(
        new Request('http://localhost/api/report-tickets/1', { method: 'DELETE' }),
        mockParams('1'),
      );
      expect(response.status).toBe(204);
      expect(deleteTicket).toHaveBeenCalledWith(1, 1, 'ADMIN');
    });

    it('returns 403 when service throws Forbidden', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteTicket).mockRejectedValue(new Error('Forbidden'));

      const response = await DELETE(
        new Request('http://localhost/api/report-tickets/1', { method: 'DELETE' }),
        mockParams('1'),
      );
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Forbidden');
    });

    it('returns 404 when service throws Not found', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteTicket).mockRejectedValue(new Error('Not found'));

      const response = await DELETE(
        new Request('http://localhost/api/report-tickets/999', { method: 'DELETE' }),
        mockParams('999'),
      );
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Ticket not found');
    });

    it('returns 500 on generic error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(deleteTicket).mockRejectedValue(new Error('DB error'));

      const response = await DELETE(
        new Request('http://localhost/api/report-tickets/1', { method: 'DELETE' }),
        mockParams('1'),
      );
      expect(response.status).toBe(500);
    });
  });

  describe('PATCH', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      const forbiddenResponse = NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      vi.mocked(enforceRouteAuth).mockResolvedValue(forbiddenResponse as never);

      const request = new Request('http://localhost/api/report-tickets/1', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await PATCH(request, mockParams('1'));
      expect(response.status).toBe(403);
    });

    it('returns 400 for invalid ID', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const request = new Request('http://localhost/api/report-tickets/0', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'RESOLVED' }),
      });

      const response = await PATCH(request, mockParams('0'));
      expect(response.status).toBe(400);
    });

    it('returns 400 on invalid body', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const request = new Request('http://localhost/api/report-tickets/1', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'INVALID_STATUS' }),
      });

      const response = await PATCH(request, mockParams('1'));
      expect(response.status).toBe(400);
    });

    it('returns 200 on success', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const updated = { id: 1, status: 'RESOLVED' };
      vi.mocked(updateTicketStatus).mockResolvedValue(updated as never);

      const request = new Request('http://localhost/api/report-tickets/1', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'RESOLVED' }),
      });

      const response = await PATCH(request, mockParams('1'));
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual(updated);
    });

    it('returns 500 on service error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(updateTicketStatus).mockRejectedValue(new Error('DB error'));

      const request = new Request('http://localhost/api/report-tickets/1', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'RESOLVED' }),
      });

      const response = await PATCH(request, mockParams('1'));
      expect(response.status).toBe(500);
    });
  });
});
