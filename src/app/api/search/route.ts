import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/index';
import { searchEntities } from '@/lib/search/fts';
import { validateSession } from '@/lib/auth';
import { SESSION_COOKIE } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const query = params.get('query') || '';

    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const isAdmin = !!token && validateSession(token);
    const visibility = isAdmin ? (params.get('visibility') || undefined) : 'public';

    const db = getDb();
    const result = searchEntities(db, {
      query,
      type: params.get('type') || undefined,
      status: params.get('status') || undefined,
      visibility,
      tags: params.get('tags')?.split(',').filter(Boolean) || undefined,
      dateFrom: params.get('dateFrom') || undefined,
      dateTo: params.get('dateTo') || undefined,
      page: parseInt(params.get('page') || '1'),
      limit: Math.min(parseInt(params.get('limit') || '20'), 100),
      sort: (params.get('sort') || 'relevance') as any,
    });

    // Map to items for backward compatibility with command palette
    return NextResponse.json({
      items: result.results,
      total: result.total,
      facets: result.facets,
      page: result.page,
      limit: result.limit,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
