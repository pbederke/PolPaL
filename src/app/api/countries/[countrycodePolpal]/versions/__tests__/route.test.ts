import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/modules/versions/versions.service', () => ({
  getVersionsByCountry: vi.fn(),
}));
vi.mock('@/lib/server/logger.server', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { GET } from '../route';
import { getVersionsByCountry } from '@/modules/versions/versions.service';

const mockParams = (overrides: Record<string, string>) => ({
  params: Promise.resolve(overrides) as Promise<{ countrycodePolpal: string }>,
});

describe('/api/countries/[countrycodePolpal]/versions route', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 200 with versions list', async () => {
      const versions = [
        { versionKey: 'v1', version: '1.0', versionName: null, versionUrl: '', versionCitation: [], projectKey: 'p1', projectNameShort: 'P', projectName: 'Proj', projectUrl: '', datasetKey: 'ds1', datasetNameShort: 'D', datasetName: 'Data', datasetUrl: '' },
      ];
      vi.mocked(getVersionsByCountry).mockResolvedValue(versions as never);

      const response = await GET(
        new Request('http://localhost/api/countries/US/versions'),
        mockParams({ countrycodePolpal: 'US' }),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(versions);
      expect(getVersionsByCountry).toHaveBeenCalledWith('US');
    });

    it('returns 200 with empty array when no versions', async () => {
      vi.mocked(getVersionsByCountry).mockResolvedValue([] as never);

      const response = await GET(
        new Request('http://localhost/api/countries/XX/versions'),
        mockParams({ countrycodePolpal: 'XX' }),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual([]);
    });

    it('returns 500 on error', async () => {
      vi.mocked(getVersionsByCountry).mockRejectedValue(new Error('DB error'));

      const response = await GET(
        new Request('http://localhost/api/countries/US/versions'),
        mockParams({ countrycodePolpal: 'US' }),
      );
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toHaveProperty('message', 'Internal server error');
    });
  });
});
