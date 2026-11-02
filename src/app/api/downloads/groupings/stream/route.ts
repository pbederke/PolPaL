import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { streamDownloadGroupings } from '@/modules/downloads/downloads.service';
import { logDownload } from '@/modules/downloads/download-log.service';
import { downloadLimiter, getClientIp } from '@/lib/server/rate-limit.server';
import { logSecurityEvent } from '@/lib/server/security-events.server';

export async function GET(request: Request) {
  const _auth = await enforceRouteAuth('/api/downloads/groupings/stream', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  const ip = getClientIp(request);
  try {
    await downloadLimiter.consume(ip);
  } catch {
    logSecurityEvent('RATE_LIMIT_HIT', { ip, route: '/api/downloads/groupings/stream' });
    return NextResponse.json({ message: 'Too many download requests. Please try again later.' }, { status: 429 });
  }

  const url = new URL(request.url);
  const countriesParam = url.searchParams.get('countries');
  const regionsParam = url.searchParams.get('regions');

  const countries = countriesParam ? countriesParam.split(',').map(c => c.trim()).filter(Boolean) : [];
  const regions = regionsParam ? regionsParam.split(',').map(r => r.trim()).filter(Boolean) : [];

  const filters = {
    ...(countries.length > 0 ? { countries } : {}),
    ...(regions.length > 0 ? { regions } : {}),
  };

  logDownload({ downloadType: 'GROUPINGS', filters });
  const dateStr = new Date().toISOString().slice(0, 16).replace(':', '-').replace('T', '_');
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamDownloadGroupings(filters)) {
          controller.enqueue(new TextEncoder().encode(chunk));
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Disposition': `attachment; filename=PolPaL_groupings_${dateStr}.csv`,
      'Content-Type': 'text/csv; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  });
}

