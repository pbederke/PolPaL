import { describe, it, expect } from 'vitest';
import { AboutCreateSchema, AboutUpdateSchema } from '../about.schema';

describe('about.schema', () => {
  const valid = { tableName: 'member' as const };

  it('AboutCreateSchema accepts valid entry', () => {
    expect(AboutCreateSchema.safeParse(valid)).toHaveProperty('success', true);
  });
  it('AboutCreateSchema rejects invalid tableName', () => {
    expect(AboutCreateSchema.safeParse({ tableName: 'INVALID' })).toHaveProperty('success', false);
  });
  it('AboutUpdateSchema accepts partial fields', () => {
    expect(AboutUpdateSchema.safeParse({ name: 'John' })).toHaveProperty('success', true);
  });
});
