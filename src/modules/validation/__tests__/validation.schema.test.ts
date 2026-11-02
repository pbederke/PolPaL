import { describe, it, expect } from 'vitest';
import { ValidateLinkSchema, DeleteValidateLinkSchema } from '../validation.schema';

describe('validation.schema', () => {
  describe('ValidateLinkSchema', () => {
    describe('valid inputs', () => {
      it('accepts valid APPROVED validation', () => {
        const result = ValidateLinkSchema.safeParse({
          linkId: 1,
          validated: 'APPROVED',
        });
        expect(result.success).toBe(true);
      });

      it('accepts valid REJECTED validation', () => {
        const result = ValidateLinkSchema.safeParse({
          linkId: 1,
          validated: 'REJECTED',
        });
        expect(result.success).toBe(true);
      });

      it('accepts valid NONE validation', () => {
        const result = ValidateLinkSchema.safeParse({
          linkId: 1,
          validated: 'NONE',
        });
        expect(result.success).toBe(true);
      });

      it('accepts with optional comment', () => {
        const result = ValidateLinkSchema.safeParse({
          linkId: 1,
          validated: 'APPROVED',
          comment: 'Looks correct',
        });
        expect(result.success).toBe(true);
      });

      it('accepts with null comment', () => {
        const result = ValidateLinkSchema.safeParse({
          linkId: 1,
          validated: 'APPROVED',
          comment: null,
        });
        expect(result.success).toBe(true);
      });

      it('accepts with undefined comment', () => {
        const result = ValidateLinkSchema.safeParse({
          linkId: 1,
          validated: 'APPROVED',
          comment: undefined,
        });
        expect(result.success).toBe(true);
      });

      it('accepts without comment field', () => {
        const result = ValidateLinkSchema.safeParse({
          linkId: 1,
          validated: 'APPROVED',
        });
        expect(result.success).toBe(true);
      });
    });

    describe('invalid inputs', () => {
      it('rejects missing linkId', () => {
        const result = ValidateLinkSchema.safeParse({
          validated: 'APPROVED',
        });
        expect(result.success).toBe(false);
      });

      it('rejects missing validated', () => {
        const result = ValidateLinkSchema.safeParse({
          linkId: 1,
        });
        expect(result.success).toBe(false);
      });

      it('rejects non-number linkId', () => {
        const result = ValidateLinkSchema.safeParse({
          linkId: '1',
          validated: 'APPROVED',
        });
        expect(result.success).toBe(false);
      });

      it('rejects non-integer linkId', () => {
        const result = ValidateLinkSchema.safeParse({
          linkId: 1.5,
          validated: 'APPROVED',
        });
        expect(result.success).toBe(false);
      });

      it('rejects zero linkId', () => {
        const result = ValidateLinkSchema.safeParse({
          linkId: 0,
          validated: 'APPROVED',
        });
        expect(result.success).toBe(false);
      });

      it('rejects negative linkId', () => {
        const result = ValidateLinkSchema.safeParse({
          linkId: -1,
          validated: 'APPROVED',
        });
        expect(result.success).toBe(false);
      });

      it('rejects invalid validation status', () => {
        const result = ValidateLinkSchema.safeParse({
          linkId: 1,
          validated: 'INVALID',
        });
        expect(result.success).toBe(false);
      });

      it('rejects lowercase validation status', () => {
        const result = ValidateLinkSchema.safeParse({
          linkId: 1,
          validated: 'approved',
        });
        expect(result.success).toBe(false);
      });

      it('rejects comment longer than 1000 chars', () => {
        const result = ValidateLinkSchema.safeParse({
          linkId: 1,
          validated: 'APPROVED',
          comment: 'A'.repeat(1001),
        });
        expect(result.success).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('accepts comment at exactly 1000 chars', () => {
        const result = ValidateLinkSchema.safeParse({
          linkId: 1,
          validated: 'APPROVED',
          comment: 'A'.repeat(1000),
        });
        expect(result.success).toBe(true);
      });

      it('trims whitespace from comment', () => {
        const result = ValidateLinkSchema.safeParse({
          linkId: 1,
          validated: 'APPROVED',
          comment: '  test  ',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.comment).toBe('test');
        }
      });

      it('accepts empty string comment', () => {
        const result = ValidateLinkSchema.safeParse({
          linkId: 1,
          validated: 'APPROVED',
          comment: '',
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe('DeleteValidateLinkSchema', () => {
    describe('valid inputs', () => {
      it('accepts valid linkId', () => {
        const result = DeleteValidateLinkSchema.safeParse({ linkId: 1 });
        expect(result.success).toBe(true);
      });

      it('accepts large linkId', () => {
        const result = DeleteValidateLinkSchema.safeParse({ linkId: 999999 });
        expect(result.success).toBe(true);
      });
    });

    describe('invalid inputs', () => {
      it('rejects missing linkId', () => {
        const result = DeleteValidateLinkSchema.safeParse({});
        expect(result.success).toBe(false);
      });

      it('rejects non-number linkId', () => {
        const result = DeleteValidateLinkSchema.safeParse({ linkId: '1' });
        expect(result.success).toBe(false);
      });

      it('rejects non-integer linkId', () => {
        const result = DeleteValidateLinkSchema.safeParse({ linkId: 1.5 });
        expect(result.success).toBe(false);
      });

      it('rejects zero linkId', () => {
        const result = DeleteValidateLinkSchema.safeParse({ linkId: 0 });
        expect(result.success).toBe(false);
      });

      it('rejects negative linkId', () => {
        const result = DeleteValidateLinkSchema.safeParse({ linkId: -1 });
        expect(result.success).toBe(false);
      });
    });
  });
});
