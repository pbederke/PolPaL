import { describe, it, expect } from 'vitest';
import { ReportTicketCreateSchema, ReportTicketStatusUpdateSchema, ReportTicketStatusValues } from '../report-tickets.schema';

describe('report-tickets.schema', () => {
  describe('ReportTicketCreateSchema', () => {
    const valid = { title: 'Bug report', description: 'Something broke' };

    it('accepts valid minimal ticket', () => {
      expect(ReportTicketCreateSchema.safeParse(valid)).toHaveProperty('success', true);
    });
    it('accepts with optional url', () => {
      expect(ReportTicketCreateSchema.safeParse({ ...valid, url: 'https://example.com/issue' })).toHaveProperty('success', true);
    });
    it('accepts null url', () => {
      expect(ReportTicketCreateSchema.safeParse({ ...valid, url: null })).toHaveProperty('success', true);
    });
    it('rejects empty title', () => {
      expect(ReportTicketCreateSchema.safeParse({ ...valid, title: '' })).toHaveProperty('success', false);
    });
    it('rejects title longer than 150 chars', () => {
      expect(ReportTicketCreateSchema.safeParse({ ...valid, title: 'x'.repeat(151) })).toHaveProperty('success', false);
    });
    it('rejects empty description', () => {
      expect(ReportTicketCreateSchema.safeParse({ ...valid, description: '' })).toHaveProperty('success', false);
    });
    it('rejects description longer than 2000 chars', () => {
      expect(ReportTicketCreateSchema.safeParse({ ...valid, description: 'x'.repeat(2001) })).toHaveProperty('success', false);
    });
  });

  describe('ReportTicketStatusUpdateSchema', () => {
    it('accepts all valid statuses', () => {
      for (const status of ReportTicketStatusValues) {
        expect(ReportTicketStatusUpdateSchema.safeParse({ status })).toHaveProperty('success', true);
      }
    });
    it('rejects invalid status', () => {
      expect(ReportTicketStatusUpdateSchema.safeParse({ status: 'PENDING' })).toHaveProperty('success', false);
    });
    it('rejects missing status', () => {
      expect(ReportTicketStatusUpdateSchema.safeParse({})).toHaveProperty('success', false);
    });
  });

  describe('ReportTicketStatusValues', () => {
    it('contains exactly 4 statuses', () => {
      expect(ReportTicketStatusValues).toHaveLength(4);
    });
    it('includes OPEN, IN_PROGRESS, RESOLVED, CLOSED', () => {
      expect(ReportTicketStatusValues).toContain('OPEN');
      expect(ReportTicketStatusValues).toContain('IN_PROGRESS');
      expect(ReportTicketStatusValues).toContain('RESOLVED');
      expect(ReportTicketStatusValues).toContain('CLOSED');
    });
  });
});
