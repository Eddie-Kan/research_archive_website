import { NextRequest, NextResponse } from 'next/server';
import { ulid } from 'ulid';
import { validateEdgeData } from '@/lib/ingestion/validator';
import { addEdgeToFile, removeEdgeFromFile, readEdgesFile } from '@/lib/admin/file-writer';
import { upsertEdge } from '@/lib/db/queries';
import { getDb } from '@/lib/db/index';
import { auditLog } from '@/lib/audit';
import { requireAdminSession } from '@/lib/auth/session';

// GET — list all edges with entity name lookup
export async function GET(request: NextRequest) {
  const authError = requireAdminSession(request);
  if (authError) return authError;
  try {
    const edges = readEdgesFile() as Array<Record<string, unknown>>;

    // Collect all referenced entity IDs
    const ids = new Set<string>();
    for (const e of edges) {
      if (e.from_id) ids.add(e.from_id as string);
      if (e.to_id) ids.add(e.to_id as string);
    }

    // Batch-fetch entity titles from DB
    const entityMap: Record<string, { title_en: string | null; title_zh: string | null; type: string }> = {};
    if (ids.size > 0) {
      const db = getDb();
      const placeholders = [...ids].map(() => '?').join(', ');
      const rows = db.prepare(
        `SELECT id, title_en, title_zh, type FROM entities WHERE id IN (${placeholders})`
      ).all(...ids) as Array<{ id: string; title_en: string | null; title_zh: string | null; type: string }>;
      for (const r of rows) {
        entityMap[r.id] = { title_en: r.title_en, title_zh: r.title_zh, type: r.type };
      }
    }

    return NextResponse.json({ data: edges, entityMap });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST — create edge
export async function POST(request: NextRequest) {
  const authError = requireAdminSession(request);
  if (authError) return authError;
  try {
    const { edge: edgeData } = await request.json();

    if (!edgeData || typeof edgeData !== 'object') {
      return NextResponse.json({ error: 'Edge data required' }, { status: 400 });
    }

    // Generate ID if not provided
    if (!edgeData.id) {
      edgeData.id = `edge-${ulid().toLowerCase()}`;
    }
    if (!edgeData.created_at) {
      edgeData.created_at = new Date().toISOString();
    }

    // Validate schema
    const validation = validateEdgeData(edgeData);
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
    }

    // Verify both entities exist
    const db = getDb();
    const fromExists = db.prepare('SELECT 1 FROM entities WHERE id = ?').get(edgeData.from_id);
    const toExists = db.prepare('SELECT 1 FROM entities WHERE id = ?').get(edgeData.to_id);
    const missing: string[] = [];
    if (!fromExists) missing.push(`from_id "${edgeData.from_id}" not found`);
    if (!toExists) missing.push(`to_id "${edgeData.to_id}" not found`);
    if (missing.length) {
      return NextResponse.json({ error: 'Referenced entities do not exist', details: missing }, { status: 400 });
    }

    // Upsert to DB first (atomic, rollback-safe)
    upsertEdge(edgeData);

    // Then persist to edges.json (source-of-truth file)
    addEdgeToFile(edgeData);

    auditLog('edge.create', { detail: `${edgeData.from_id} -> ${edgeData.to_id} (${edgeData.edge_type})` });
    return NextResponse.json({ ok: true, id: edgeData.id }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE — delete edge by ID (passed in body)
export async function DELETE(request: NextRequest) {
  const authError = requireAdminSession(request);
  if (authError) return authError;
  try {
    const { id } = await request.json();
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Edge ID required' }, { status: 400 });
    }

    // Remove from DB first (atomic, rollback-safe)
    const db = getDb();
    db.prepare('DELETE FROM edges WHERE id = ?').run(id);

    // Then remove from edges.json
    removeEdgeFromFile(id);

    auditLog('edge.delete', { detail: id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
