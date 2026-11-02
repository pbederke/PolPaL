import { describe, it, expect } from 'vitest';
import { EntityCreateSchema, EntityUpdateSchema } from '../entities.schema';

describe('entities.schema', () => {
  const valid = { nameShort: 'SPD', nameEnglish: 'Social Democratic Party', entityType: 'PARTY' as const };

  describe('EntityCreateSchema', () => {
    it('accepts valid minimal object', () => {
      expect(EntityCreateSchema.safeParse(valid)).toHaveProperty('success', true);
    });
    it('accepts full object with optional fields', () => {
      expect(EntityCreateSchema.safeParse({ ...valid, partyfactsId: 42, wikidataId: 'Q123', comment: 'note' })).toHaveProperty('success', true);
    });
    it('accepts all valid entity types', () => {
      for (const entityType of ['PARTY', 'GROUPING', 'INDEPENDENT', 'OTHERS', 'RESIDUAL', 'UNKNOWN', 'UNASSIGNED']) {
        expect(EntityCreateSchema.safeParse({ ...valid, entityType })).toHaveProperty('success', true);
      }
    });
    it('rejects empty nameShort', () => {
      expect(EntityCreateSchema.safeParse({ ...valid, nameShort: '' })).toHaveProperty('success', false);
    });
    it('rejects empty nameEnglish', () => {
      expect(EntityCreateSchema.safeParse({ ...valid, nameEnglish: '' })).toHaveProperty('success', false);
    });
    it('rejects invalid entityType', () => {
      expect(EntityCreateSchema.safeParse({ ...valid, entityType: 'INVALID' })).toHaveProperty('success', false);
    });
  });

  describe('EntityUpdateSchema', () => {
    it('accepts empty object (all fields optional)', () => {
      expect(EntityUpdateSchema.safeParse({})).toHaveProperty('success', true);
    });
    it('accepts partial update', () => {
      expect(EntityUpdateSchema.safeParse({ nameShort: 'CDU' })).toHaveProperty('success', true);
    });
    it('rejects empty nameShort when provided', () => {
      expect(EntityUpdateSchema.safeParse({ nameShort: '' })).toHaveProperty('success', false);
    });
  });
});

