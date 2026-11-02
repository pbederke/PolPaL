import { describe, it, expect } from 'vitest';
import { EntityInCountryCreateSchema } from '../entities-in-countries.schema';

describe('entities-in-countries.schema', () => {
  describe('EntityInCountryCreateSchema', () => {
    it('accepts valid input', () => {
      expect(EntityInCountryCreateSchema.safeParse({ polpalId: 1, countrycodePolpal: 'DE' })).toHaveProperty('success', true);
    });
    it('accepts with optional comment', () => {
      expect(EntityInCountryCreateSchema.safeParse({ polpalId: 1, countrycodePolpal: 'DE', comment: 'note' })).toHaveProperty('success', true);
    });
    it('rejects empty countrycodePolpal', () => {
      expect(EntityInCountryCreateSchema.safeParse({ polpalId: 1, countrycodePolpal: '' })).toHaveProperty('success', false);
    });
    it('rejects missing polpalId', () => {
      expect(EntityInCountryCreateSchema.safeParse({ countrycodePolpal: 'DE' })).toHaveProperty('success', false);
    });
    it('rejects non-integer polpalId', () => {
      expect(EntityInCountryCreateSchema.safeParse({ polpalId: 1.5, countrycodePolpal: 'DE' })).toHaveProperty('success', false);
    });
  });
});

