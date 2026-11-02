import { EntityTypesEnum } from '@/lib/shared/enums';
import { z } from 'zod';

export const EntityCreateSchema = z.object({
  isHidden: z.boolean().optional(),
  isHiddenReason: z.string().optional().nullable(),
  nameShort: z.string().min(1),
  nameEnglish: z.string().min(1),
  name: z.string().optional().nullable(),
  entityType: z.enum(EntityTypesEnum),
  partyfactsId: z.number().int().optional().nullable(),
  wikipediaUrl: z.string().optional().nullable(),
  wikidataId: z.string().optional().nullable(),
  comment: z.string().optional().nullable(),
});

export const EntityUpdateSchema = EntityCreateSchema.partial();

