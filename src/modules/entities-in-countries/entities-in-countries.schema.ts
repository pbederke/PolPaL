import { z } from 'zod';

export const EntityInCountryCreateSchema = z.object({
  polpalId: z.number().int(),
  countrycodePolpal: z.string().min(1),
  comment: z.string().optional().nullable(),
});

