import { describe, it, expect } from 'vitest';
import { DatasetCreateSchema, DatasetUpdateSchema } from '../datasets.schema';

describe('datasets.schema', () => {
  const valid = { datasetKey: 'parliament', projectKey: 'polpal', datasetNameShort: 'Parl.', datasetName: 'Parliament Dataset' };

  describe('DatasetCreateSchema', () => {
    it('accepts valid minimal object', () => {
      expect(DatasetCreateSchema.safeParse(valid)).toHaveProperty('success', true);
    });
    it('accepts with optional fields', () => {
      expect(DatasetCreateSchema.safeParse({ ...valid, datasetUrl: 'https://example.com', comment: 'note' })).toHaveProperty('success', true);
    });
    it('rejects missing datasetKey', () => {
      const { datasetKey: _, ...noKey } = valid;
      expect(DatasetCreateSchema.safeParse(noKey)).toHaveProperty('success', false);
    });
    it('rejects empty datasetName', () => {
      expect(DatasetCreateSchema.safeParse({ ...valid, datasetName: '' })).toHaveProperty('success', false);
    });
  });

  describe('DatasetUpdateSchema', () => {
    it('accepts empty object (all optional)', () => {
      expect(DatasetUpdateSchema.safeParse({})).toHaveProperty('success', true);
    });
    it('accepts partial update', () => {
      expect(DatasetUpdateSchema.safeParse({ datasetName: 'Updated' })).toHaveProperty('success', true);
    });
  });
});

