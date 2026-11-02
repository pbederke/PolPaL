import { describe, it, expect } from 'vitest';
import { ReferenceCreateSchema, ReferenceUpdateSchema } from '../references.schema';

describe('references.schema', () => {
  const valid = { type: 'Website' as const, value: 'https://example.com' };

  it('ReferenceCreateSchema accepts valid reference', () => {
    expect(ReferenceCreateSchema.safeParse(valid)).toHaveProperty('success', true);
  });
  it('ReferenceCreateSchema rejects invalid type', () => {
    expect(ReferenceCreateSchema.safeParse({ ...valid, type: 'INVALID' })).toHaveProperty('success', false);
  });
  it('ReferenceUpdateSchema accepts partial fields', () => {
    expect(ReferenceUpdateSchema.safeParse({ value: 'https://updated.com' })).toHaveProperty('success', true);
  });
});
