import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { logDownload } from '@/modules/downloads/download-log.service';
import { downloadLimiter, getClientIp } from '@/lib/server/rate-limit.server';
import logger from '@/lib/server/logger.server';
import { ScriptLogBodySchema } from '@/modules/downloads/downloads.schema';

export async function POST(request: Request) {
  const _auth = await enforceRouteAuth('/api/downloads/scripts/log', 'POST');
  if (_auth instanceof NextResponse) return _auth;
  try {
    await downloadLimiter.consume(getClientIp(request));
  } catch {
    return NextResponse.json({ message: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = ScriptLogBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
  }

  try {
    logDownload({ downloadType: 'SCRIPT', versionKey: parsed.data.scriptName, filters: {} });
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    logger.error({ err: error }, 'POST /api/downloads/scripts/log failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
