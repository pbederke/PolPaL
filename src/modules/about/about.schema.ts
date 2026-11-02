import { z } from 'zod';
import { TableNameAboutEnum } from '@/lib/shared/enums';

export const AboutCreateSchema = z.object({
  tableName: z.enum(TableNameAboutEnum),
  name: z.string().nullable().default(null),
  affiliation: z.string().nullable().default(null),
  time: z.string().nullable().default(null),
  url: z.string().nullable().default(null),
  funding: z.string().nullable().default(null),
  comment: z.string().nullable().default(null),
});

export const AboutUpdateSchema = z.object({
  name: z.string().nullable().default(null),
  affiliation: z.string().nullable().default(null),
  time: z.string().nullable().default(null),
  url: z.string().nullable().default(null),
  funding: z.string().nullable().default(null),
  comment: z.string().nullable().default(null),
});

