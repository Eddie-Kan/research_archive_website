import { NextRequest, NextResponse } from 'next/server';
import { ulid } from 'ulid';
import { getDb } from '@/lib/db/index';
import { requireAdminSession } from '@/lib/auth/session';
import { auditLog } from '@/lib/audit';

export async function GET(request: NextRequest) {
  const authError = requireAdminSession(request);
  if (authError) return authError;
  try {
    const db = getDb();
    const views = db.prepare('SELECT * FROM curated_views ORDER BY updated_at DESC').all();
    return NextResponse.json(views);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = requireAdminSession(request);
  if (authError) return authError;
  try {
    const body = await request.json();
    const id = body.id || ulid().toLowerCase();
    const db = getDb();
    db.prepare(`
      INSERT INTO curated_views (id, name_en, name_zh, description, filter_config, entity_allowlist, access_token)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      body.name_en || null,
      body.name_zh || null,
      body.description || null,
      body.filter_config ? JSON.stringify(body.filter_config) : null,
      body.entity_allowlist ? JSON.stringify(body.entity_allowlist) : null,
      body.access_token || null,
    );
    auditLog('view.create', { detail: id });
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authError = requireAdminSession(request);
  if (authError) return authError;
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }
    const db = getDb();
    const sets: string[] = [];
    const params: unknown[] = [];

    const fields: Array<[string, unknown]> = [
      ['name_en', body.name_en],
      ['name_zh', body.name_zh],
      ['description', body.description],
      ['filter_config', body.filter_config !== undefined ? (body.filter_config ? JSON.stringify(body.filter_config) : null) : undefined],
      ['entity_allowlist', body.entity_allowlist !== undefined ? (body.entity_allowlist ? JSON.stringify(body.entity_allowlist) : null) : undefined],
      ['access_token', body.access_token],
    ];

    for (const [col, val] of fields) {
      if (val !== undefined) {
        sets.push(`${col} = ?`);
        params.push(val ?? null);
      }
    }

    if (sets.length === 0) {
      return NextResponse.json({ ok: true });
    }

    sets.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')");
    params.push(body.id);
    db.prepare(`UPDATE curated_views SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    auditLog('view.update', { detail: body.id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authError = requireAdminSession(request);
  if (authError) return authError;
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }
    const db = getDb();
    db.prepare('DELETE FROM curated_views WHERE id = ?').run(id);
    auditLog('view.delete', { detail: id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
