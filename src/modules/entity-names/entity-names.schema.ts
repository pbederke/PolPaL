import { z } from 'zod';

export const EntityNameCreateSchema = z.object({
  polpalId: z.number().int(),
  nameShort: z.string().min(1),
  name: z.string().min(1),
  language: z.string().min(1),
  comment: z.string().optional().nullable(),
  startYear: z.number().int().optional().nullable(),
  startMonth: z.number().int().optional().nullable(),
  startDay: z.number().int().optional().nullable(),
  endYear: z.number().int().optional().nullable(),
  endMonth: z.number().int().optional().nullable(),
  endDay: z.number().int().optional().nullable(),
});

export const EntityNameDateUpdateSchema = z.object({
  startYear: z.number().int().optional().nullable(),
  startMonth: z.number().int().optional().nullable(),
  startDay: z.number().int().optional().nullable(),
  endYear: z.number().int().optional().nullable(),
  endMonth: z.number().int().optional().nullable(),
  endDay: z.number().int().optional().nullable(),
});

export const EntityNameUpdateSchema = z.object({
  nameShort: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  language: z.string().min(1).optional(),
  comment: z.string().optional().nullable(),
  startYear: z.number().int().optional().nullable(),
  startMonth: z.number().int().optional().nullable(),
  startDay: z.number().int().optional().nullable(),
  endYear: z.number().int().optional().nullable(),
  endMonth: z.number().int().optional().nullable(),
  endDay: z.number().int().optional().nullable(),
});

