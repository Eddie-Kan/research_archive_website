import { NextRequest, NextResponse } from 'next/server';
import { getEntityService } from '@/domain/services/entity.service';
import { validateSession } from '@/lib/auth';
import { SESSION_COOKIE } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const isAdmin = !!token && validateSession(token);
    const requestedMode = (request.nextUrl.searchParams.get('mode') || 'public') as 'private' | 'public';
    const mode = isAdmin ? requestedMode : 'public';
    const projectId = request.nextUrl.searchParams.get('projectId') || undefined;
    const service = getEntityService();
    const events = service.getTimeline(mode, projectId);
    const projects = service.getProjectList(mode);
    return NextResponse.json({ events, projects });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
