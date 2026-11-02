import { z } from 'zod';
import { RoleEnum } from '@/lib/shared/enums';

export const ApproveUserUpdateSchema = z.object({
  approvedByAdmin: z.boolean().optional(),
  role: z.enum(RoleEnum).optional(),
  declineNote: z.string().min(1).max(500).optional(),
});

const PASSWORD_POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export const CreateUserSchema = z.object({
  username: z.string().min(1).max(64),
  nameFirst: z.string().min(1).max(128),
  nameLast: z.string().min(1).max(128),
  email: z.email().max(256),
  password: z.string().regex(PASSWORD_POLICY, 'Password must be at least 8 characters and contain uppercase, lowercase, and a number'),
  role: z.enum(RoleEnum),
  approvedByAdmin: z.boolean(),
  emailVerified: z.boolean(),
});

export const UpdateUserSchema = z.object({
  username: z.string().min(1).max(64),
  nameFirst: z.string().min(1).max(128),
  nameLast: z.string().min(1).max(128),
  email: z.email().max(256),
  role: z.enum(RoleEnum),
  approvedByAdmin: z.boolean(),
  emailVerified: z.boolean(),
});

export const DeclineNoteSchema = z.object({ declineNote: z.string().max(500).optional() });

export const UserActivitiesQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid from date').optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid to date').optional(),
});

