import { NextRequest, NextResponse } from 'next/server';
import { getEntityService } from '@/domain/services/entity.service';
import { generateEntityPrintHtml, generateViewPrintHtml } from '@/lib/export/pdf';
import { validateSession } from '@/lib/auth';
import { SESSION_COOKIE } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const isAdmin = !!token && validateSession(token);
    const params = request.nextUrl.searchParams;
    const entityId = params.get('entityId');
    const type = params.get('type');
    const viewName = params.get('viewName') || 'Export';
    const locale = (params.get('locale') || 'en') as 'en' | 'zh-Hans';
    const mode = isAdmin ? 'private' : 'public';

    const service = getEntityService();

    // Multi-entity export by type
    if (type) {
      const list = service.list({ type, limit: 200 }, mode);
      const entities = list.items.map(item => service.getById(item.id, mode)).filter(Boolean);
      const result = generateViewPrintHtml(entities as any[], viewName, locale);
      return new NextResponse(result.html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Single entity export
    if (!entityId) {
      return NextResponse.json({ error: 'entityId or type required' }, { status: 400 });
    }

    const entity = service.getById(entityId, mode);
    if (!entity) {
      return NextResponse.json({ error: 'Entity not found' }, { status: 404 });
    }

    const result = generateEntityPrintHtml(entity, locale);
    return new NextResponse(result.html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
