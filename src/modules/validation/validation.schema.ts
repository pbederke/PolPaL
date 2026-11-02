import { z } from 'zod';
import { ValidationEnum } from '@/lib/shared/enums';

export const ValidateLinkSchema = z.object({
  linkId: z.number().int().positive(),
  validated: z.enum(ValidationEnum),
  comment: z.string().trim().max(1000).optional().nullable(),
});

export type ValidateLinkInput = z.infer<typeof ValidateLinkSchema>;

export const DeleteValidateLinkSchema = z.object({
  linkId: z.number().int().positive(),
});

export type DeleteValidateLinkInput = z.infer<typeof DeleteValidateLinkSchema>;
