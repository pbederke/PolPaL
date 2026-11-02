import { z } from 'zod';

export const LinkCreateSchema = z.object({
  uniqueObservationId: z.string().min(1),
  polpalId: z.number().int(),
  startYear: z.number().int().optional().nullable(),
  startMonth: z.number().int().optional().nullable(),
  startDay: z.number().int().optional().nullable(),
  endYear: z.number().int().optional().nullable(),
  endMonth: z.number().int().optional().nullable(),
  endDay: z.number().int().optional().nullable(),
  comment: z.string().optional().nullable(),
});

export const BulkDeleteLinksSchema = z.object({
  listUniqueObservationIds: z.array(z.string().min(1)).min(1),
});

export const DeleteLinksByEntriesAndPolpalSchema = z.object({
  uniqueObservationIds: z.array(z.string().min(1)).min(1),
  polpalId: z.number().int(),
});

export const BulkCreateLinksSchema = z.object({
  entries: z.array(
    z.object({
      uniqueObservationIds: z.array(z.string().min(1)),
      polpalId: z.number().int(),
    })
  ).min(1),
});

export const AutoLinkRowSchema = z.object({
  uniqueObservationId: z.string().min(1),
  polpalId: z.number().int().positive(),
  startYear: z.number().int().nullable().optional(),
  startMonth: z.number().int().nullable().optional(),
  startDay: z.number().int().nullable().optional(),
  endYear: z.number().int().nullable().optional(),
  endMonth: z.number().int().nullable().optional(),
  endDay: z.number().int().nullable().optional(),
  comment: z.string().nullable().optional(),
});

export const AutoLinkBodySchema = z.array(AutoLinkRowSchema).max(200000);

