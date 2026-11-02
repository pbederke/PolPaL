import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getChangelogByTable, getChangelogTableNames } from '@/modules/admin/admin.service';
import { ChangeActionEnum, TableNamesEnum } from '@/lib/shared/enums';
import logger from '@/lib/server/logger.server';

export async function GET(request: Request) {
  const auth = (await enforceRouteAuth('/api/admin/changelog/deleted', 'GET'))!;
  if (auth instanceof NextResponse) return auth;
  try {
    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get('tableName');

    // No table selected yet → return the list of tables that have DELETED entries.
    if (!tableName) {
      const tableNames = await getChangelogTableNames(ChangeActionEnum.DELETED);
      return NextResponse.json({ tableNames });
    }

    if (!Object.values(TableNamesEnum).includes(tableName as TableNamesEnum)) {
      return NextResponse.json({ message: 'Invalid tableName' }, { status: 400 });
    }

    const { logs, totalCount } = await getChangelogByTable(ChangeActionEnum.DELETED, tableName as TableNamesEnum);
    return NextResponse.json({ logs, totalCount });
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/admin/changelog/deleted failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
