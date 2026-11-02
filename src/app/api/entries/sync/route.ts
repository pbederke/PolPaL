import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { syncEntries } from '@/modules/entries/entries.service';
import { syncEntriesBodySchema } from '@/modules/entries/entries.schema';
import logger from '@/lib/server/logger.server';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = (await enforceRouteAuth('/api/entries/sync', 'POST'))!;
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json();
    const parsed = syncEntriesBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request body', errors: parsed.error.issues }, { status: 400 });
    }
    const { toCreate, toUpdate, toDelete } = parsed.data;
    const result = await syncEntries(auth.userId, toCreate, toUpdate, toDelete);
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    logger.error({ err: error }, 'POST /api/entries/sync failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
