import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/report-tickets/report-tickets.service', () => ({
  getAllTickets: vi.fn(),
  getTicketsByUser: vi.fn(),
  createTicket: vi.fn(),
}));
vi.mock('@/modules/report-tickets/report-tickets.schema', async () => {
  const z = await import('zod');
  return {
    ReportTicketCreateSchema: z.default.object({
      title: z.default.string().min(1).max(150),
      description: z.default.string().min(1).max(2000),
      url: z.default.string().url().optional().nullable(),
    }),
  };
});
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { GET, POST } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getAllTickets, getTicketsByUser, createTicket } from '@/modules/report-tickets/report-tickets.service';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

const USER_AUTH = {
  userId: 2,
  username: 'testuser',
  role: 'USER',
  approvedByAdmin: true,
};

describe('/api/report-tickets route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      const forbiddenResponse = NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      vi.mocked(enforceRouteAuth).mockResolvedValue(forbiddenResponse as never);

      const response = await GET();
      expect(response.status).toBe(403);
    });

    it('returns all tickets for admin', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const tickets = [{ id: 1, title: 'Bug' }];
      vi.mocked(getAllTickets).mockResolvedValue(tickets as never);

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(tickets);
      expect(getAllTickets).toHaveBeenCalled();
      expect(getTicketsByUser).not.toHaveBeenCalled();
    });

    it('returns user tickets for non-admin', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(USER_AUTH as never);
      const tickets = [{ id: 1, title: 'Bug', userId: 2 }];
      vi.mocked(getTicketsByUser).mockResolvedValue(tickets as never);

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(tickets);
      expect(getTicketsByUser).toHaveBeenCalledWith(2);
      expect(getAllTickets).not.toHaveBeenCalled();
    });

    it('returns 500 on error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(getAllTickets).mockRejectedValue(new Error('DB error'));

      const response = await GET();
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

      const request = new Request('http://localhost/api/report-tickets', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it('returns 400 on invalid body', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const request = new Request('http://localhost/api/report-tickets', {
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
      const ticket = { id: 1, title: 'Bug Report', description: 'Details here' };
      vi.mocked(createTicket).mockResolvedValue(ticket as never);

      const request = new Request('http://localhost/api/report-tickets', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Bug Report', description: 'Details here' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body).toEqual(ticket);
    });

    it('returns 500 on service error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(createTicket).mockRejectedValue(new Error('DB error'));

      const request = new Request('http://localhost/api/report-tickets', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Bug Report', description: 'Details here' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
    });
  });
});
