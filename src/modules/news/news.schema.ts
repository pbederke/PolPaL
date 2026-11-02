import { z } from 'zod';

export const NewsCreateSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  links: z.array(z.string().min(1)).optional().nullable(),
  publishedPublicAt: z.string().min(1),
  updatedPublicAt: z.string().optional().nullable(),
});

export const NewsUpdateSchema = NewsCreateSchema.partial();

