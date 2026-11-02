import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/admin/admin.service', () => ({
  updateApproveUserAdmin: vi.fn(),
  deleteApproveUserAdmin: vi.fn(),
  getUserForApprovalDeletion: vi.fn(),
}));
vi.mock('@/modules/admin/admin.schema', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/schemas/api.schemas')>();
  return mod;
});
vi.mock('@/lib/server/email.server', () => ({
  sendApprovalGrantedEmail: vi.fn(),
  sendApprovalDeclinedEmail: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { PUT, DELETE } from '../route';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import {
  updateApproveUserAdmin,
  deleteApproveUserAdmin,
  getUserForApprovalDeletion,
} from '@/modules/admin/admin.service';
import { sendApprovalGrantedEmail, sendApprovalDeclinedEmail } from '@/lib/server/email.server';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

function mockParams(approveUserId: string) {
  return { params: Promise.resolve({ approveUserId }) as Promise<{ approveUserId: string }> };
}

function makeRequest(url: string, init?: RequestInit) {
  return new Request(url, init) as never;
}

describe('/api/admin/approveUsers/[approveUserId] route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('PUT', () => {
    const validBody = { approvedByAdmin: true, role: 'USER' as const };

    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      vi.mocked(enforceRouteAuth).mockResolvedValue(NextResponse.json({ message: 'Forbidden' }, { status: 403 } as never) as never,
      );

      const response = await PUT(
        makeRequest('http://localhost/api/admin/approveUsers/5', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(validBody),
        }),
        mockParams('5'),
      );
      expect(response.status).toBe(403);
    });

    it('returns 400 for invalid ID (non-numeric)', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await PUT(
        makeRequest('http://localhost/api/admin/approveUsers/abc', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(validBody),
        }),
        mockParams('abc'),
      );
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Invalid user ID');
    });

    it('returns 400 for invalid ID (zero)', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await PUT(
        makeRequest('http://localhost/api/admin/approveUsers/0', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(validBody),
        }),
        mockParams('0'),
      );
      expect(response.status).toBe(400);
    });

    it('returns 400 on invalid request body', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await PUT(
        makeRequest('http://localhost/api/admin/approveUsers/5', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ role: 'INVALID_ROLE' }),
        }),
        mockParams('5'),
      );
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Invalid request body');
    });

    it('returns 200 with updated user on approval', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const updatedUser = { id: 5, email: 'alice@example.com', username: 'alice', approvedByAdmin: true };
      vi.mocked(updateApproveUserAdmin).mockResolvedValue(updatedUser as never);
      vi.mocked(sendApprovalGrantedEmail).mockResolvedValue(undefined as never);

      const response = await PUT(
        makeRequest('http://localhost/api/admin/approveUsers/5', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ approvedByAdmin: true }),
        }),
        mockParams('5'),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(updatedUser);
      expect(updateApproveUserAdmin).toHaveBeenCalledWith(5, { approvedByAdmin: true });
      expect(sendApprovalGrantedEmail).toHaveBeenCalledWith('alice@example.com', 'alice');
    });

    it('sends decline email when declining with note', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const updatedUser = { id: 5, email: 'alice@example.com', username: 'alice', approvedByAdmin: false };
      vi.mocked(updateApproveUserAdmin).mockResolvedValue(updatedUser as never);
      vi.mocked(sendApprovalDeclinedEmail).mockResolvedValue(undefined as never);

      const response = await PUT(
        makeRequest('http://localhost/api/admin/approveUsers/5', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ approvedByAdmin: false, declineNote: 'Not eligible' }),
        }),
        mockParams('5'),
      );
      expect(response.status).toBe(200);
      expect(sendApprovalDeclinedEmail).toHaveBeenCalledWith('alice@example.com', 'alice', 'Not eligible');
    });

    it('does not send decline email when declining without note', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      const updatedUser = { id: 5, email: 'alice@example.com', username: 'alice', approvedByAdmin: false };
      vi.mocked(updateApproveUserAdmin).mockResolvedValue(updatedUser as never);

      await PUT(
        makeRequest('http://localhost/api/admin/approveUsers/5', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ approvedByAdmin: false }),
        }),
        mockParams('5'),
      );
      expect(sendApprovalDeclinedEmail).not.toHaveBeenCalled();
    });

    it('returns 500 on service error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(updateApproveUserAdmin).mockRejectedValue(new Error('DB error'));

      const response = await PUT(
        makeRequest('http://localhost/api/admin/approveUsers/5', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(validBody),
        }),
        mockParams('5'),
      );
      expect(response.status).toBe(500);
    });
  });

  describe('DELETE', () => {
    it('returns 403 when forbidden', async () => {
      const { NextResponse } = await import('next/server');
      vi.mocked(enforceRouteAuth).mockResolvedValue(NextResponse.json({ message: 'Forbidden' }, { status: 403 } as never) as never,
      );

      const response = await DELETE(
        makeRequest('http://localhost/api/admin/approveUsers/5', {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({}),
        }),
        mockParams('5'),
      );
      expect(response.status).toBe(403);
    });

    it('returns 400 for invalid ID (non-numeric)', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await DELETE(
        makeRequest('http://localhost/api/admin/approveUsers/abc', {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({}),
        }),
        mockParams('abc'),
      );
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Invalid user ID');
    });

    it('returns 400 for invalid ID (zero)', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await DELETE(
        makeRequest('http://localhost/api/admin/approveUsers/0', {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({}),
        }),
        mockParams('0'),
      );
      expect(response.status).toBe(400);
    });

    it('returns 400 on malformed JSON body', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);

      const response = await DELETE(
        makeRequest('http://localhost/api/admin/approveUsers/5', {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: 'not json',
        }),
        mockParams('5'),
      );
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Invalid request body');
    });

    it('returns 204 on success with default decline note', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(getUserForApprovalDeletion).mockResolvedValue({ email: 'alice@example.com', username: 'alice' } as never);
      vi.mocked(deleteApproveUserAdmin).mockResolvedValue(undefined as never);
      vi.mocked(sendApprovalDeclinedEmail).mockResolvedValue(undefined as never);

      const response = await DELETE(
        makeRequest('http://localhost/api/admin/approveUsers/5', {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({}),
        }),
        mockParams('5'),
      );
      expect(response.status).toBe(204);
      expect(deleteApproveUserAdmin).toHaveBeenCalledWith(5);
      expect(sendApprovalDeclinedEmail).toHaveBeenCalledWith('alice@example.com', 'alice', 'No reason provided.');
    });

    it('passes custom decline note', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(getUserForApprovalDeletion).mockResolvedValue({ email: 'bob@example.com', username: 'bob' } as never);
      vi.mocked(deleteApproveUserAdmin).mockResolvedValue(undefined as never);
      vi.mocked(sendApprovalDeclinedEmail).mockResolvedValue(undefined as never);

      const response = await DELETE(
        makeRequest('http://localhost/api/admin/approveUsers/5', {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ declineNote: 'Spam account' }),
        }),
        mockParams('5'),
      );
      expect(response.status).toBe(204);
      expect(sendApprovalDeclinedEmail).toHaveBeenCalledWith('bob@example.com', 'bob', 'Spam account');
    });

    it('does not send email when user not found', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(getUserForApprovalDeletion).mockResolvedValue(null as never);
      vi.mocked(deleteApproveUserAdmin).mockResolvedValue(undefined as never);

      await DELETE(
        makeRequest('http://localhost/api/admin/approveUsers/999', {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({}),
        }),
        mockParams('999'),
      );
      expect(sendApprovalDeclinedEmail).not.toHaveBeenCalled();
    });

    it('returns 500 on service error', async () => {
      vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
      vi.mocked(getUserForApprovalDeletion).mockRejectedValue(new Error('DB error'));

      const response = await DELETE(
        makeRequest('http://localhost/api/admin/approveUsers/5', {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({}),
        }),
        mockParams('5'),
      );
      expect(response.status).toBe(500);
    });
  });
});
