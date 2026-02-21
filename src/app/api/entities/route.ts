import { NextRequest, NextResponse } from 'next/server';
import { getEntityService } from '@/domain/services/entity.service';
import { validateSession } from '@/lib/auth';
import { SESSION_COOKIE } from '@/lib/auth/session';
import type { ListFilters, SortField, SortOrder } from '@/domain/types';

const VALID_SORT_FIELDS = new Set<SortField>(['created_at', 'updated_at', 'title']);
const VALID_SORT_ORDERS = new Set<SortOrder>(['asc', 'desc']);

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const rawSort = params.get('sort');
    const rawOrder = params.get('order');
    const filters: ListFilters = {
      type: params.get('type') || undefined,
      status: params.get('status') || undefined,
      visibility: params.get('visibility') || undefined,
      search: params.get('search') || undefined,
      tags: params.get('tags')?.split(',').filter(Boolean) || undefined,
      sort: rawSort && VALID_SORT_FIELDS.has(rawSort as SortField) ? rawSort as SortField : 'created_at',
      order: rawOrder && VALID_SORT_ORDERS.has(rawOrder as SortOrder) ? rawOrder as SortOrder : 'desc',
      page: parseInt(params.get('page') || '1'),
      limit: Math.min(parseInt(params.get('limit') || '20'), 100),
      dateFrom: params.get('dateFrom') || undefined,
      dateTo: params.get('dateTo') || undefined,
    };

    // Only allow private mode for authenticated admin sessions
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const isAdmin = !!token && validateSession(token);
    const requestedMode = (params.get('mode') || 'public') as 'private' | 'public' | 'curated';
    const mode = isAdmin ? requestedMode : 'public';
    const service = getEntityService();
    const result = service.list(filters, mode);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
