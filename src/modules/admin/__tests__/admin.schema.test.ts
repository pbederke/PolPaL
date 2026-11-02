import { describe, it, expect } from 'vitest';
import { ApproveUserUpdateSchema, CreateUserSchema, UpdateUserSchema, DeclineNoteSchema, UserActivitiesQuerySchema } from '../admin.schema';

describe('admin.schema', () => {
  describe('ApproveUserUpdateSchema', () => {
    it('accepts empty object (all fields optional)', () => {
      expect(ApproveUserUpdateSchema.safeParse({})).toHaveProperty('success', true);
    });
    it('accepts approvedByAdmin alone', () => {
      expect(ApproveUserUpdateSchema.safeParse({ approvedByAdmin: true })).toHaveProperty('success', true);
    });
    it('accepts role alone', () => {
      expect(ApproveUserUpdateSchema.safeParse({ role: 'EDITOR' })).toHaveProperty('success', true);
    });
    it('accepts declineNote alone', () => {
      expect(ApproveUserUpdateSchema.safeParse({ declineNote: 'Not eligible' })).toHaveProperty('success', true);
    });
    it('accepts full object', () => {
      expect(ApproveUserUpdateSchema.safeParse({ approvedByAdmin: false, role: 'USER', declineNote: 'Rejected' })).toHaveProperty('success', true);
    });
    it('rejects invalid role', () => {
      expect(ApproveUserUpdateSchema.safeParse({ role: 'SUPERADMIN' })).toHaveProperty('success', false);
    });
    it('rejects empty declineNote', () => {
      expect(ApproveUserUpdateSchema.safeParse({ declineNote: '' })).toHaveProperty('success', false);
    });
    it('rejects declineNote longer than 500 chars', () => {
      expect(ApproveUserUpdateSchema.safeParse({ declineNote: 'x'.repeat(501) })).toHaveProperty('success', false);
    });
  });

  const validUser = { username: 'testuser', nameFirst: 'John', nameLast: 'Doe', email: 'john@example.com', password: 'Secure123', role: 'USER' as const, approvedByAdmin: false, emailVerified: false };

  describe('CreateUserSchema', () => {
    it('accepts valid user', () => {
      expect(CreateUserSchema.safeParse(validUser)).toHaveProperty('success', true);
    });
    it('rejects weak password (no uppercase)', () => {
      expect(CreateUserSchema.safeParse({ ...validUser, password: 'secure123' })).toHaveProperty('success', false);
    });
    it('rejects weak password (no number)', () => {
      expect(CreateUserSchema.safeParse({ ...validUser, password: 'SecurePassword' })).toHaveProperty('success', false);
    });
    it('rejects invalid email', () => {
      expect(CreateUserSchema.safeParse({ ...validUser, email: 'bad' })).toHaveProperty('success', false);
    });
    it('rejects invalid role', () => {
      expect(CreateUserSchema.safeParse({ ...validUser, role: 'SUPERADMIN' as never })).toHaveProperty('success', false);
    });
  });

  describe('UpdateUserSchema', () => {
    const validUpdate = { username: 'u', nameFirst: 'J', nameLast: 'D', email: 'j@d.com', role: 'USER' as const, approvedByAdmin: true, emailVerified: true };
    it('accepts valid update', () => {
      expect(UpdateUserSchema.safeParse(validUpdate)).toHaveProperty('success', true);
    });
    it('rejects missing required fields', () => {
      expect(UpdateUserSchema.safeParse({})).toHaveProperty('success', false);
    });
    it('rejects invalid email', () => {
      expect(UpdateUserSchema.safeParse({ ...validUpdate, email: 'bad' })).toHaveProperty('success', false);
    });
  });

  describe('DeclineNoteSchema', () => {
    it('accepts empty object', () => {
      expect(DeclineNoteSchema.safeParse({})).toHaveProperty('success', true);
    });
    it('accepts valid note', () => {
      expect(DeclineNoteSchema.safeParse({ declineNote: 'Not eligible' })).toHaveProperty('success', true);
    });
    it('rejects note exceeding 500 chars', () => {
      expect(DeclineNoteSchema.safeParse({ declineNote: 'x'.repeat(501) })).toHaveProperty('success', false);
    });
  });

  describe('UserActivitiesQuerySchema', () => {
    it('accepts valid dates', () => {
      expect(UserActivitiesQuerySchema.safeParse({ from: '2024-01-15', to: '2024-12-31' })).toHaveProperty('success', true);
    });
    it('accepts empty object', () => {
      expect(UserActivitiesQuerySchema.safeParse({})).toHaveProperty('success', true);
    });
    it('rejects invalid date format', () => {
      expect(UserActivitiesQuerySchema.safeParse({ from: '15-01-2024' })).toHaveProperty('success', false);
    });
  });
});
