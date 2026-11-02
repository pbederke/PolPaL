import { z } from 'zod';
import { ReportTicketStatus } from '@/lib/shared/enums';

export const ReportTicketCreateSchema = z.object({
  title: z.string().min(1).max(150),
  description: z.string().min(1).max(2000),
  url: z.url().optional().nullable(),
});

export const ReportTicketStatusValues = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const satisfies [ReportTicketStatus, ...ReportTicketStatus[]];

export const ReportTicketStatusUpdateSchema = z.object({
  status: z.enum(ReportTicketStatusValues),
});
