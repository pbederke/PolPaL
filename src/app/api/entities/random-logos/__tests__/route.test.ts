import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/server/route-auth.server', () => ({
  enforceRouteAuth: vi.fn(),
}));
vi.mock('@/modules/entities/entities.service', () => ({
  getEntitiesWithWikidataIds: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getEntitiesWithWikidataIds } from '@/modules/entities/entities.service';

const ADMIN_AUTH = {
  userId: 1,
  username: 'admin',
  role: 'ADMIN',
  approvedByAdmin: true,
};

const CANDIDATES = [
  { polpalId: 1, nameShort: 'A', nameEnglish: 'Alpha', wikidataId: 'Q100' },
  { polpalId: 2, nameShort: 'B', nameEnglish: 'Beta', wikidataId: 'Q200' },
];

const SPARQL_RESPONSE = {
  results: {
    bindings: [{ logo: { value: 'https://commons.wikimedia.org/wiki/Special:FilePath/Logo.svg' } }],
  },
};

const COMMONS_RESPONSE = {
  query: {
    pages: {
      '1': {
        imageinfo: [
          {
            extmetadata: {
              Artist: { value: '<div>Artist Name</div>' },
              Credit: { value: 'Credit' },
              LicenseShortName: { value: 'CC BY-SA 4.0' },
              Restrictions: { value: '' },
            },
            descriptionurl: 'https://commons.wikimedia.org/wiki/File:Logo.svg',
          },
        ],
      },
    },
  },
};

describe('/api/entities/random-logos route', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
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

  it('returns 200 with logo entities', async () => {
    const { GET } = await import('../route');
    vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
    vi.mocked(getEntitiesWithWikidataIds).mockResolvedValue(CANDIDATES as never);

    vi.mocked(global.fetch).mockResolvedValue({ ok: true, json: async () => SPARQL_RESPONSE } as never);
    // Mock both wikidata SPARQL and commons attribution calls
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => SPARQL_RESPONSE } as never)
      .mockResolvedValueOnce({ ok: true, json: async () => COMMONS_RESPONSE } as never)
      .mockResolvedValueOnce({ ok: true, json: async () => SPARQL_RESPONSE } as never)
      .mockResolvedValueOnce({ ok: true, json: async () => COMMONS_RESPONSE } as never);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeLessThanOrEqual(6);
    if (body.length > 0) {
      expect(body[0]).toHaveProperty('logoUrl');
      expect(body[0]).toHaveProperty('polpalId');
    }
  });

  it('returns empty array when no candidates', async () => {
    const { GET } = await import('../route');
    vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
    vi.mocked(getEntitiesWithWikidataIds).mockResolvedValue([] as never);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([]);
  });

  it('returns empty array when no logos found', async () => {
    const { GET } = await import('../route');
    vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
    vi.mocked(getEntitiesWithWikidataIds).mockResolvedValue(CANDIDATES as never);
    vi.mocked(global.fetch).mockResolvedValue({ ok: false } as never);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([]);
  });

  it('returns 500 on error', async () => {
    const { GET } = await import('../route');
    vi.mocked(enforceRouteAuth).mockResolvedValue(ADMIN_AUTH as never);
    vi.mocked(getEntitiesWithWikidataIds).mockRejectedValue(new Error('DB error'));

    const response = await GET();
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toHaveProperty('message', 'Internal server error');
  });
});
