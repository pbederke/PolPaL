import { NextResponse } from 'next/server';
import { getAuthPayload } from '@/lib/server/auth.server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { streamDownloadEntriesByVersion, canDownloadHiddenContent } from '@/modules/downloads/downloads.service';
import { logDownload } from '@/modules/downloads/download-log.service';
import { downloadLimiter, getClientIp } from '@/lib/server/rate-limit.server';
import { logSecurityEvent } from '@/lib/server/security-events.server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ versionKey: string }> }
) {
  const _auth = await enforceRouteAuth('/api/downloads/entries/[versionKey]/stream', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  const ip = getClientIp(request);
  try {
    await downloadLimiter.consume(ip);
  } catch {
    logSecurityEvent('RATE_LIMIT_HIT', { ip, route: '/api/downloads/entries/stream' });
    return NextResponse.json({ message: 'Too many download requests. Please try again later.' }, { status: 429 });
  }
  const { versionKey } = await params;
  if (!versionKey) {
    return new Response('versionKey parameter is required', { status: 400 });
  }

  const url = new URL(request.url);
  const countriesParam = url.searchParams.get('countries');
  const regionsParam = url.searchParams.get('regions');
  const yearFromParam = url.searchParams.get('yearFrom');
  const yearToParam = url.searchParams.get('yearTo');
  const variablesParam = url.searchParams.get('variables');
  const short = url.searchParams.get('short') === 'true';
  const includeSpecialEntityLinks = url.searchParams.get('includeSpecialEntityLinks') !== 'false';

  const countries = countriesParam ? countriesParam.split(',').map(c => c.trim()).filter(Boolean) : [];
  const regions = regionsParam ? regionsParam.split(',').map(r => r.trim()).filter(Boolean) : [];
  const yearFrom = yearFromParam ? parseInt(yearFromParam, 10) : undefined;
  const yearTo = yearToParam ? parseInt(yearToParam, 10) : undefined;
  const variables = variablesParam ? variablesParam.split(',').map(v => v.trim()).filter(Boolean) : [];

  const filters = {
    ...(countries.length > 0 ? { countries } : {}),
    ...(regions.length > 0 ? { regions } : {}),
    ...(yearFrom != null && !isNaN(yearFrom) ? { yearFrom } : {}),
    ...(yearTo != null && !isNaN(yearTo) ? { yearTo } : {}),
    ...(variables.length > 0 ? { variables } : {}),
    ...(short ? { short } : {}),
    ...(!includeSpecialEntityLinks ? { includeSpecialEntityLinks: false } : {}),
  };

  logDownload({ downloadType: 'ENTRIES', versionKey, filters });
  const auth = await getAuthPayload();
  const safeVersionKey = versionKey.replace(/[^a-zA-Z0-9._-]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 16).replace(':', '-').replace('T', '_');
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamDownloadEntriesByVersion(versionKey, filters, canDownloadHiddenContent(auth?.role))) {
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
      'Content-Disposition': `attachment; filename=PolPaL_${safeVersionKey}_${dateStr}.csv`,
      'Content-Type': 'text/csv; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  });
}
