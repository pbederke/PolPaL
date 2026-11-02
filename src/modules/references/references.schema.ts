import { z } from 'zod';
import { ReferenceTypeEnum } from '@/lib/shared/enums';

export const ReferenceCreateSchema = z.object({
  type: z.enum(ReferenceTypeEnum),
  value: z.string().min(1),
  referencedField: z.string().optional().nullable(),
  language: z.string().optional().nullable(),
  accessedAt: z.string().optional().nullable(),
  comment: z.string().optional().nullable(),
  polpalId: z.number().int().optional().nullable(),
  entityChangeId: z.number().int().optional().nullable(),
  entityNameId: z.number().int().optional().nullable(),
  groupingMemberId: z.number().int().optional().nullable(),
  entitiesInCountriesId: z.number().int().optional().nullable(),
});

export const ReferenceUpdateSchema = z.object({
  type: z.enum(ReferenceTypeEnum).optional(),
  value: z.string().min(1).optional(),
  referencedField: z.string().optional().nullable(),
  language: z.string().optional().nullable(),
  accessedAt: z.string().optional().nullable(),
  comment: z.string().optional().nullable(),
});

