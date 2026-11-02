import { z } from 'zod';

export const ProjectCreateSchema = z.object({
  projectKey: z.string().min(1),
  projectNameShort: z.string().min(1),
  projectName: z.string().min(1),
  projectUrl: z.string().optional().nullable(),
  projectDescription: z.string().optional().nullable(),
  isHidden: z.boolean().optional(),
  isHiddenReason: z.string().optional().nullable(),
  comment: z.string().optional().nullable(),
});

export const ProjectUpdateSchema = ProjectCreateSchema.partial();

