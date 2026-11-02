import { z } from 'zod';

export const DatasetCreateSchema = z.object({
  datasetKey: z.string().min(1),
  projectKey: z.string().min(1),
  datasetNameShort: z.string().min(1),
  datasetName: z.string().min(1),
  datasetUrl: z.string().optional().nullable(),
  datasetDescription: z.string().optional().nullable(),
  isHidden: z.boolean().optional(),
  isHiddenReason: z.string().optional().nullable(),
  comment: z.string().optional().nullable(),
});

export const DatasetUpdateSchema = DatasetCreateSchema.partial();

