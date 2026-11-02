import { z } from 'zod';

export const GroupingMemberCreateSchema = z.object({
  entityId: z.number().int(),
  groupingId: z.number().int(),
  startYear: z.number().int(),
  startMonth: z.number().int().optional().nullable(),
  startDay: z.number().int().optional().nullable(),
  endYear: z.number().int().optional().nullable(),
  endMonth: z.number().int().optional().nullable(),
  endDay: z.number().int().optional().nullable(),
  comment: z.string().optional().nullable(),
});

export const GroupingMemberUpdateSchema = z.object({
  startYear: z.number().int().optional().nullable(),
  startMonth: z.number().int().optional().nullable(),
  startDay: z.number().int().optional().nullable(),
  endYear: z.number().int().optional().nullable(),
  endMonth: z.number().int().optional().nullable(),
  endDay: z.number().int().optional().nullable(),
  comment: z.string().optional().nullable(),
});

