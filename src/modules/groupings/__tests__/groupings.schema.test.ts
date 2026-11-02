import { describe, it, expect } from 'vitest';
import { GroupingMemberCreateSchema, GroupingMemberUpdateSchema } from '../groupings.schema';

describe('groupings.schema', () => {
  const valid = { entityId: 1, groupingId: 2, startYear: 2020 };

  describe('GroupingMemberCreateSchema', () => {
    it('accepts valid minimal object', () => {
      expect(GroupingMemberCreateSchema.safeParse(valid)).toHaveProperty('success', true);
    });
    it('accepts full object with optional fields', () => {
      expect(GroupingMemberCreateSchema.safeParse({ ...valid, startMonth: 6, endYear: 2025, comment: 'note' })).toHaveProperty('success', true);
    });
    it('rejects missing startYear', () => {
      expect(GroupingMemberCreateSchema.safeParse({ entityId: 1, groupingId: 2 })).toHaveProperty('success', false);
    });
    it('rejects non-integer entityId', () => {
      expect(GroupingMemberCreateSchema.safeParse({ ...valid, entityId: 1.5 })).toHaveProperty('success', false);
    });
  });

  describe('GroupingMemberUpdateSchema', () => {
    it('accepts empty object (all optional)', () => {
      expect(GroupingMemberUpdateSchema.safeParse({})).toHaveProperty('success', true);
    });
    it('accepts partial update', () => {
      expect(GroupingMemberUpdateSchema.safeParse({ endYear: 2025, comment: 'left' })).toHaveProperty('success', true);
    });
  });
});

