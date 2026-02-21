import { NextRequest, NextResponse } from 'next/server';
import { ulid } from 'ulid';
import crypto from 'crypto';
import { getDb } from '@/lib/db/index';
import { getStorageProvider } from '@/lib/db/storage-abstraction';
import { requireAdminSession } from '@/lib/auth/session';
import { auditLog } from '@/lib/audit';

export async function POST(request: NextRequest) {
  const authError = requireAdminSession(request);
  if (authError) return authError;
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const entityId = formData.get('entity_id') as string | null;
    const mediaType = formData.get('media_type') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
    const id = ulid().toLowerCase();
    const ext = file.name.split('.').pop() || 'bin';
    const sourcePath = entityId ? `${entityId}/${id}.${ext}` : `${id}.${ext}`;

    const storage = getStorageProvider();
    await storage.writeFile(sourcePath, buffer);

    const db = getDb();
    db.prepare(`
      INSERT INTO media (id, entity_id, media_type, source_path, checksum, size_bytes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, entityId, mediaType || file.type, sourcePath, checksum, buffer.length);

    auditLog('media.upload', { entityId: entityId || undefined, detail: sourcePath });
    return NextResponse.json({ id, source_path: sourcePath, size: buffer.length }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const authError = requireAdminSession(request);
  if (authError) return authError;
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT m.id, m.entity_id, m.media_type, m.source_path, m.size_bytes, m.created_at,
             e.title_en, e.title_zh
      FROM media m LEFT JOIN entities e ON m.entity_id = e.id
      ORDER BY m.created_at DESC LIMIT 200
    `).all();
    return NextResponse.json(rows);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
