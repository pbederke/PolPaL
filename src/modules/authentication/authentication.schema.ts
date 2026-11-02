import { z } from 'zod';

const PASSWORD_POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export const PasswordChangeSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().regex(PASSWORD_POLICY),
});

export const LoginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

export const RegisterSchema = z.object({
  nameFirst: z.string().min(1),
  nameLast: z.string().min(1),
  email: z.email(),
  username: z.string().min(1),
  password: z.string().regex(PASSWORD_POLICY),
});

export const ForgotPasswordSchema = z.object({
  email: z.email(),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().regex(PASSWORD_POLICY),
});

export const ValidateEmailSchema = z.object({
  email: z.email(),
});

export const ResendSchema = z.object({ email: z.email() });
