import { describe, it, expect } from 'vitest';
import { VersionCreateSchema, VersionUpdateSchema } from '../versions.schema';

describe('versions.schema', () => {
  const valid = {
    versionKey: 'v1', datasetKey: 'ds', projectKey: 'proj',
    version: '1.0', versionUrl: 'https://example.com',
    versionCitation: ['Author 2024'],
  };

  describe('VersionCreateSchema', () => {
    it('accepts valid minimal object', () => {
      expect(VersionCreateSchema.safeParse(valid)).toHaveProperty('success', true);
    });
    it('accepts multiple citations', () => {
      expect(VersionCreateSchema.safeParse({ ...valid, versionCitation: ['C1', 'C2', 'C3'] })).toHaveProperty('success', true);
    });
    it('accepts optional fields', () => {
      expect(VersionCreateSchema.safeParse({ ...valid, versionName: 'Release 1', isHidden: false })).toHaveProperty('success', true);
    });
    it('rejects missing versionCitation', () => {
      const { versionCitation: _, ...noC } = valid;
      expect(VersionCreateSchema.safeParse(noC)).toHaveProperty('success', false);
    });
    it('rejects empty versionKey', () => {
      expect(VersionCreateSchema.safeParse({ ...valid, versionKey: '' })).toHaveProperty('success', false);
    });
  });

  describe('VersionUpdateSchema', () => {
    it('accepts empty object (all optional)', () => {
      expect(VersionUpdateSchema.safeParse({})).toHaveProperty('success', true);
    });
    it('accepts partial update', () => {
      expect(VersionUpdateSchema.safeParse({ version: '2.0', isHidden: true })).toHaveProperty('success', true);
    });
    it('rejects empty version string when provided', () => {
      expect(VersionUpdateSchema.safeParse({ version: '' })).toHaveProperty('success', false);
    });
  });
});

