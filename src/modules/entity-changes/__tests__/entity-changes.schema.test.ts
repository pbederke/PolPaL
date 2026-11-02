import { describe, it, expect } from 'vitest';
import { EntityChangeCreateSchema, EntityChangeUpdateSchema } from '../entity-changes.schema';

describe('entity-changes.schema', () => {
  const valid = { polpalIdOld: 1, polpalIdNew: 2, changeYear: 2020, changeType: 'MERGE' as const };

  describe('EntityChangeCreateSchema', () => {
    it('accepts valid minimal object', () => {
      expect(EntityChangeCreateSchema.safeParse(valid)).toHaveProperty('success', true);
    });
    it('accepts with optional month/day/comment', () => {
      expect(EntityChangeCreateSchema.safeParse({ ...valid, changeMonth: 6, changeDay: 15, comment: 'note' })).toHaveProperty('success', true);
    });
    it('accepts all valid change types', () => {
      for (const changeType of ['SPLIT', 'MERGE', 'SPLIT_MERGE', 'REBRAND', 'UNKNOWN']) {
        expect(EntityChangeCreateSchema.safeParse({ ...valid, changeType })).toHaveProperty('success', true);
      }
    });
    it('rejects invalid changeType', () => {
      expect(EntityChangeCreateSchema.safeParse({ ...valid, changeType: 'INVALID' })).toHaveProperty('success', false);
    });
    it('rejects non-integer polpalIdOld', () => {
      expect(EntityChangeCreateSchema.safeParse({ ...valid, polpalIdOld: 1.5 })).toHaveProperty('success', false);
    });
  });

  describe('EntityChangeUpdateSchema', () => {
    it('accepts full update', () => {
      expect(EntityChangeUpdateSchema.safeParse({ changeYear: 2021, comment: 'updated' })).toHaveProperty('success', true);
    });
    it('rejects missing changeYear', () => {
      expect(EntityChangeUpdateSchema.safeParse({ comment: 'only comment' })).toHaveProperty('success', false);
    });
  });
});

