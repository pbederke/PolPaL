import { describe, it, expect } from 'vitest';
import { NewsCreateSchema, NewsUpdateSchema } from '../news.schema';

describe('news.schema', () => {
  const valid = { title: 'Headline', content: 'Body text', publishedPublicAt: '2026-01-01' };

  it('NewsCreateSchema accepts valid news', () => {
    expect(NewsCreateSchema.safeParse(valid)).toHaveProperty('success', true);
  });
  it('NewsCreateSchema rejects missing content', () => {
    expect(NewsCreateSchema.safeParse({ title: 'T', publishedPublicAt: '2026-01-01' })).toHaveProperty('success', false);
  });
  it('NewsUpdateSchema accepts partial fields', () => {
    expect(NewsUpdateSchema.safeParse({ title: 'Updated' })).toHaveProperty('success', true);
  });
});
