import { describe, it, expect } from 'vitest';
import { EntityNameCreateSchema, EntityNameDateUpdateSchema, EntityNameUpdateSchema } from '../entity-names.schema';

describe('entity-names.schema', () => {
  const valid = { polpalId: 1, nameShort: 'SPD', name: 'Sozialdemokratische Partei Deutschlands', language: 'de' };

  describe('EntityNameCreateSchema', () => {
    it('accepts valid minimal object', () => {
      expect(EntityNameCreateSchema.safeParse(valid)).toHaveProperty('success', true);
    });
    it('accepts with optional date fields', () => {
      expect(EntityNameCreateSchema.safeParse({ ...valid, startYear: 1863, endYear: null })).toHaveProperty('success', true);
    });
    it('rejects empty nameShort', () => {
      expect(EntityNameCreateSchema.safeParse({ ...valid, nameShort: '' })).toHaveProperty('success', false);
    });
    it('rejects empty language', () => {
      expect(EntityNameCreateSchema.safeParse({ ...valid, language: '' })).toHaveProperty('success', false);
    });
    it('rejects missing polpalId', () => {
      const { polpalId: _, ...noId } = valid;
      expect(EntityNameCreateSchema.safeParse(noId)).toHaveProperty('success', false);
    });
  });

  describe('EntityNameDateUpdateSchema', () => {
    it('accepts empty object (all optional)', () => {
      expect(EntityNameDateUpdateSchema.safeParse({})).toHaveProperty('success', true);
    });
    it('accepts valid date fields', () => {
      expect(EntityNameDateUpdateSchema.safeParse({ startYear: 2000, endYear: 2020 })).toHaveProperty('success', true);
    });
  });

  describe('EntityNameUpdateSchema', () => {
    it('accepts empty object (all optional)', () => {
      expect(EntityNameUpdateSchema.safeParse({})).toHaveProperty('success', true);
    });
    it('accepts partial name update', () => {
      expect(EntityNameUpdateSchema.safeParse({ nameShort: 'CDU' })).toHaveProperty('success', true);
    });
    it('rejects empty nameShort when provided', () => {
      expect(EntityNameUpdateSchema.safeParse({ nameShort: '' })).toHaveProperty('success', false);
    });
  });
});

