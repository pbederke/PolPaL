import { describe, it, expect } from 'vitest';
import { LinkCreateSchema, BulkDeleteLinksSchema, DeleteLinksByEntriesAndPolpalSchema, BulkCreateLinksSchema, AutoLinkRowSchema, AutoLinkBodySchema } from '../links.schema';

describe('links.schema', () => {
  it('LinkCreateSchema accepts valid link', () => {
    expect(LinkCreateSchema.safeParse({ uniqueObservationId: 'obs-1', polpalId: 1 })).toHaveProperty('success', true);
  });
  it('BulkDeleteLinksSchema rejects empty array', () => {
    expect(BulkDeleteLinksSchema.safeParse({ listUniqueObservationIds: [] })).toHaveProperty('success', false);
  });
  it('DeleteLinksByEntriesAndPolpalSchema accepts valid input', () => {
    expect(DeleteLinksByEntriesAndPolpalSchema.safeParse({ uniqueObservationIds: ['obs-1'], polpalId: 1 })).toHaveProperty('success', true);
  });
  it('BulkCreateLinksSchema rejects empty entries', () => {
    expect(BulkCreateLinksSchema.safeParse({ entries: [] })).toHaveProperty('success', false);
  });

  describe('AutoLinkRowSchema', () => {
    it('accepts valid row', () => {
      expect(AutoLinkRowSchema.safeParse({ uniqueObservationId: 'obs1', polpalId: 1 })).toHaveProperty('success', true);
    });
    it('accepts all optional fields', () => {
      expect(AutoLinkRowSchema.safeParse({ uniqueObservationId: 'obs1', polpalId: 1, startYear: 2020, endYear: null, comment: 'x' })).toHaveProperty('success', true);
    });
    it('rejects negative polpalId', () => {
      expect(AutoLinkRowSchema.safeParse({ uniqueObservationId: 'obs1', polpalId: -1 })).toHaveProperty('success', false);
    });
    it('rejects non-integer polpalId', () => {
      expect(AutoLinkRowSchema.safeParse({ uniqueObservationId: 'obs1', polpalId: 1.5 })).toHaveProperty('success', false);
    });
  });

  describe('AutoLinkBodySchema', () => {
    it('accepts valid array', () => {
      expect(AutoLinkBodySchema.safeParse([{ uniqueObservationId: 'obs1', polpalId: 1 }])).toHaveProperty('success', true);
    });
    it('accepts empty array', () => {
      expect(AutoLinkBodySchema.safeParse([])).toHaveProperty('success', true);
    });
    it('rejects non-array', () => {
      expect(AutoLinkBodySchema.safeParse({ not: 'array' })).toHaveProperty('success', false);
    });
  });
});

