import { NextResponse } from 'next/server';
import { getAuthPayload } from '@/lib/server/auth.server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { streamDownloadVersionsOverview, canDownloadHiddenContent } from '@/modules/downloads/downloads.service';
import { logDownload } from '@/modules/downloads/download-log.service';
import { downloadLimiter, getClientIp } from '@/lib/server/rate-limit.server';
import { logSecurityEvent } from '@/lib/server/security-events.server';

export async function GET(request: Request) {
  const _auth = await enforceRouteAuth('/api/downloads/versions-overview/stream', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  const ip = getClientIp(request);
  try {
    await downloadLimiter.consume(ip);
  } catch {
    logSecurityEvent('RATE_LIMIT_HIT', { ip, route: '/api/downloads/versions-overview/stream' });
    return NextResponse.json({ message: 'Too many download requests. Please try again later.' }, { status: 429 });
  }

  const auth = await getAuthPayload();

  logDownload({ downloadType: 'VERSIONS_OVERVIEW', filters: {} });

  const dateStr = new Date().toISOString().slice(0, 16).replace(':', '-').replace('T', '_');
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamDownloadVersionsOverview(canDownloadHiddenContent(auth?.role))) {
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
      'Content-Disposition': `attachment; filename=PolPaL_versions-overview_${dateStr}.csv`,
      'Content-Type': 'text/csv; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  });
}
