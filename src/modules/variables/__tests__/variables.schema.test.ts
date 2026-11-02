import { describe, it, expect } from 'vitest';
import { VariableCreateSchema } from '../variables.schema';

describe('variables.schema', () => {
  describe('VariableCreateSchema', () => {
    const valid = { entryEntityIdVar: 'vote_share', varTitle: 'Vote Share', varContent: 'Percentage of votes received' };

    it('accepts valid variable', () => {
      expect(VariableCreateSchema.safeParse(valid)).toHaveProperty('success', true);
    });
    it('rejects empty entryEntityIdVar', () => {
      expect(VariableCreateSchema.safeParse({ ...valid, entryEntityIdVar: '' })).toHaveProperty('success', false);
    });
    it('rejects empty varTitle', () => {
      expect(VariableCreateSchema.safeParse({ ...valid, varTitle: '' })).toHaveProperty('success', false);
    });
    it('rejects empty varContent', () => {
      expect(VariableCreateSchema.safeParse({ ...valid, varContent: '' })).toHaveProperty('success', false);
    });
    it('rejects missing required fields', () => {
      expect(VariableCreateSchema.safeParse({})).toHaveProperty('success', false);
    });
  });
});
