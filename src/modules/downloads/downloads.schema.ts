import { z } from 'zod';

export const ScriptLogBodySchema = z.object({
  scriptName: z.string().min(1).max(200).regex(/^[a-zA-Z0-9._-]+$/),
});
