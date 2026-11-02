import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/entities/entities.service', () => ({
  getEntitiesWithColors: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getEntitiesWithColors } from '@/modules/entities/entities.service';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

describe('/api/entities/random-colors route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns 403 when auth fails', async () => {
    const { GET } = await import('../route');
    const { NextResponse } = await import('next/server');
    vi.mocked(enforceRouteAuth).mockResolvedValue(
      NextResponse.json({ message: 'Forbidden' }, { status: 403 }) as never
    );

    const response = await GET();
    expect(response.status).toBe(403);
  });

  it('returns 200 with color entities', async () => {
    const { GET } = await import('../route');
    vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
    vi.mocked(getEntitiesWithColors).mockResolvedValue([
      { polpalId: 1, nameShort: 'A', nameEnglish: 'Alpha', color: '#ff0000' },
      { polpalId: 2, nameShort: 'B', nameEnglish: 'Beta', color: '#00ff00' },
      { polpalId: 3, nameShort: 'C', nameEnglish: 'Gamma', color: '#0000ff' },
    ] as never);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(3);
    expect(body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ polpalId: 1, color: '#ff0000' }),
        expect.objectContaining({ polpalId: 2, color: '#00ff00' }),
        expect.objectContaining({ polpalId: 3, color: '#0000ff' }),
      ]),
    );
  });

  it('returns empty array when no candidates', async () => {
    const { GET } = await import('../route');
    vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
    vi.mocked(getEntitiesWithColors).mockResolvedValue([] as never);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([]);
  });

  it('filters out entities without color', async () => {
    const { GET } = await import('../route');
    vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
    vi.mocked(getEntitiesWithColors).mockResolvedValue([
      { polpalId: 1, nameShort: 'A', nameEnglish: 'Alpha', color: '#ff0000' },
      { polpalId: 2, nameShort: 'B', nameEnglish: 'Beta', color: null },
    ] as never);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.length).toBe(1);
    expect(body[0].polpalId).toBe(1);
  });

  it('returns at most 6 entities', async () => {
    const { GET } = await import('../route');
    vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
    const candidates = Array.from({ length: 10 }, (_, i) => ({
      polpalId: i + 1,
      nameShort: `E${i + 1}`,
      nameEnglish: `Entity ${i + 1}`,
      color: `#${String(i + 1).padStart(6, '0')}`,
    }));
    vi.mocked(getEntitiesWithColors).mockResolvedValue(candidates as never);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.length).toBeLessThanOrEqual(6);
  });

  it('returns 500 on error', async () => {
    const { GET } = await import('../route');
    vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
    vi.mocked(getEntitiesWithColors).mockRejectedValue(new Error('DB error'));

    const response = await GET();
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toHaveProperty('message', 'Internal server error');
  });
});
