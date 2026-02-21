import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/index';
import { requireAdminSession } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  const authError = requireAdminSession(request);
  if (authError) return authError;
  try {
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '100'), 500);
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0');
    const db = getDb();
    const rows = db.prepare(
      'SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(limit, offset);
    const { total } = db.prepare('SELECT COUNT(*) as total FROM audit_log').get() as { total: number };
    return NextResponse.json({ data: rows, total });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
