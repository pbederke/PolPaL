import { z } from 'zod';

export const VariableCreateSchema = z.object({
  entryEntityIdVar: z.string().min(1),
  varTitle: z.string().min(1),
  varContent: z.string().min(1),
});
