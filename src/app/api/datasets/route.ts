import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { createDataset } from '@/modules/datasets/datasets.service';
import { DatasetCreateSchema } from '@/modules/datasets/datasets.schema';
import logger from '@/lib/server/logger.server';

export async function POST(request: Request) {
  const auth = await enforceRouteAuth('/api/datasets', 'POST');
  if (auth instanceof NextResponse) return auth;
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  try {
    const parsed = DatasetCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }
    const dataset = await createDataset(parsed.data, auth.userId);
    return NextResponse.json(dataset, { status: 201 });
  } catch (error: unknown) {
    logger.error({ err: error }, 'POST /api/datasets failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
