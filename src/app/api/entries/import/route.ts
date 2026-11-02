import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { importEntriesStreaming } from '@/modules/entries/entries.service';
import logger from '@/lib/server/logger.server';
import { ZodError } from 'zod';

export const maxDuration = 120; // seconds
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = (await enforceRouteAuth('/api/entries/import', 'POST'))!;
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json();
    if (!Array.isArray(body)) {
      return NextResponse.json({ message: 'Request body must be an array' }, { status: 400 });
    }
    const result = await importEntriesStreaming(auth.userId, body);
    return NextResponse.json({
      success: true,
      message: 'Entries imported successfully',
      createdCount: result.totalCreated,
      batchId: result.batchId,
    }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }
    logger.error({ err: error }, 'POST /api/entries/import failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
