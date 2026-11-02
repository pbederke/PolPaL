import { describe, it, expect } from 'vitest';
import {
  LoginSchema,
  RegisterSchema,
  PasswordChangeSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  ValidateEmailSchema,
  ResendSchema,
} from '../authentication.schema';

describe('authentication.schema', () => {
  describe('LoginSchema', () => {
    it('accepts valid credentials', () => {
      expect(LoginSchema.safeParse({ identifier: 'alice', password: 'pass' })).toHaveProperty('success', true);
    });
    it('rejects empty identifier', () => {
      expect(LoginSchema.safeParse({ identifier: '', password: 'pass' })).toHaveProperty('success', false);
    });
    it('rejects empty password', () => {
      expect(LoginSchema.safeParse({ identifier: 'alice', password: '' })).toHaveProperty('success', false);
    });
  });

  describe('RegisterSchema', () => {
    const valid = { nameFirst: 'Alice', nameLast: 'Smith', email: 'alice@test.com', username: 'alice', password: 'Strong1Pass' };

    it('accepts valid registration data', () => {
      expect(RegisterSchema.safeParse(valid)).toHaveProperty('success', true);
    });
    it('rejects weak password (no uppercase)', () => {
      expect(RegisterSchema.safeParse({ ...valid, password: 'weakpass1' })).toHaveProperty('success', false);
    });
    it('rejects weak password (no digit)', () => {
      expect(RegisterSchema.safeParse({ ...valid, password: 'WeakPassNoDigit' })).toHaveProperty('success', false);
    });
    it('rejects weak password (too short)', () => {
      expect(RegisterSchema.safeParse({ ...valid, password: 'Sh0rt' })).toHaveProperty('success', false);
    });
    it('rejects invalid email', () => {
      expect(RegisterSchema.safeParse({ ...valid, email: 'not-an-email' })).toHaveProperty('success', false);
    });
    it('rejects empty username', () => {
      expect(RegisterSchema.safeParse({ ...valid, username: '' })).toHaveProperty('success', false);
    });
  });

  describe('PasswordChangeSchema', () => {
    it('accepts valid password change', () => {
      expect(PasswordChangeSchema.safeParse({ oldPassword: 'OldPass1', newPassword: 'NewPass1' })).toHaveProperty('success', true);
    });
    it('rejects empty oldPassword', () => {
      expect(PasswordChangeSchema.safeParse({ oldPassword: '', newPassword: 'NewPass1' })).toHaveProperty('success', false);
    });
    it('rejects weak newPassword', () => {
      expect(PasswordChangeSchema.safeParse({ oldPassword: 'OldPass1', newPassword: 'weak' })).toHaveProperty('success', false);
    });
  });

  describe('ForgotPasswordSchema', () => {
    it('accepts valid email', () => {
      expect(ForgotPasswordSchema.safeParse({ email: 'alice@test.com' })).toHaveProperty('success', true);
    });
    it('rejects invalid email', () => {
      expect(ForgotPasswordSchema.safeParse({ email: 'bad' })).toHaveProperty('success', false);
    });
  });

  describe('ResetPasswordSchema', () => {
    it('accepts valid reset data', () => {
      expect(ResetPasswordSchema.safeParse({ token: 'abc123', password: 'NewPass1' })).toHaveProperty('success', true);
    });
    it('rejects empty token', () => {
      expect(ResetPasswordSchema.safeParse({ token: '', password: 'NewPass1' })).toHaveProperty('success', false);
    });
    it('rejects weak password', () => {
      expect(ResetPasswordSchema.safeParse({ token: 'abc', password: 'weak' })).toHaveProperty('success', false);
    });
  });

  describe('ValidateEmailSchema', () => {
    it('accepts valid email', () => {
      expect(ValidateEmailSchema.safeParse({ email: 'alice@test.com' })).toHaveProperty('success', true);
    });
    it('rejects invalid email', () => {
      expect(ValidateEmailSchema.safeParse({ email: 'not-valid' })).toHaveProperty('success', false);
    });
  });

  describe('ResendSchema', () => {
    it('accepts valid email', () => {
      expect(ResendSchema.safeParse({ email: 'test@example.com' })).toHaveProperty('success', true);
    });
    it('rejects invalid email', () => {
      expect(ResendSchema.safeParse({ email: 'not-email' })).toHaveProperty('success', false);
    });
    it('rejects missing email', () => {
      expect(ResendSchema.safeParse({})).toHaveProperty('success', false);
    });
  });
});
