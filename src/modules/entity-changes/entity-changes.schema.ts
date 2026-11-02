import { EntityChangesEnum } from '@/lib/shared/enums';
import { z } from 'zod';

export const EntityChangeCreateSchema = z.object({
  polpalIdOld: z.number().int(),
  polpalIdNew: z.number().int(),
  changeYear: z.number().int(),
  changeMonth: z.number().int().optional().nullable(),
  changeDay: z.number().int().optional().nullable(),
  changeType: z.enum(EntityChangesEnum),
  comment: z.string().optional().nullable(),
});

export const EntityChangeUpdateSchema = z.object({
  changeYear: z.number().int(),
  changeMonth: z.number().int().optional().nullable(),
  changeDay: z.number().int().optional().nullable(),
  comment: z.string().optional().nullable(),
});

