import { z } from 'zod';

export const VersionCreateSchema = z.object({
  versionKey: z.string().min(1),
  datasetKey: z.string().min(1),
  projectKey: z.string().min(1),
  version: z.string().min(1),
  versionUrl: z.string().min(1),
  versionCitation: z.array(z.string().min(1)),
  versionName: z.string().optional().nullable(),
  shownOnWebsite: z.boolean().optional(),
  isHidden: z.boolean().optional(),
  isHiddenReason: z.string().optional().nullable(),
  commentVersion: z.string().optional().nullable(),
  commentEntries: z.string().optional().nullable(),
});

export const VersionUpdateSchema = z.object({
  version: z.string().min(1).optional(),
  versionName: z.string().optional().nullable(),
  versionUrl: z.string().min(1).optional(),
  versionCitation: z.array(z.string().min(1)).optional(),
  isHidden: z.boolean().optional(),
  isHiddenReason: z.string().optional().nullable(),
  commentVersion: z.string().optional().nullable(),
  commentEntries: z.string().optional().nullable(),
});

