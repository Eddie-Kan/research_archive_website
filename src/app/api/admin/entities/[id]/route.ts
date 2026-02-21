import { NextRequest, NextResponse } from 'next/server';
import { validateEntityData } from '@/lib/ingestion/validator';
import { ingestSingleEntity, deleteEntity as deleteEntityFromDb } from '@/lib/ingestion/pipeline';
import { writeEntityFile, writeMdxFile, deleteEntityFiles, removeEntityEdgesFromFile } from '@/lib/admin/file-writer';
import { getEntityById } from '@/lib/db/queries';
import { auditLog } from '@/lib/audit';
import { requireAdminSession } from '@/lib/auth/session';

// PUT — update entity
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireAdminSession(request);
  if (authError) return authError;
  try {
    const { id } = await params;
    const body = await request.json();
    const { entity: entityData, body_en, body_zh } = body;

    if (!entityData || typeof entityData !== 'object') {
      return NextResponse.json({ error: 'Entity data required' }, { status: 400 });
    }

    // Ensure ID matches route
    entityData.id = id;

    // Optimistic locking: reject if entity was modified since client loaded it
    if (body.expected_updated_at) {
      const current = getEntityById(id);
      if (current && current.updated_at !== body.expected_updated_at) {
        return NextResponse.json(
          { error: 'Entity was modified by another session. Please reload and try again.', code: 'CONFLICT' },
          { status: 409 }
        );
      }
    }

    entityData.updated_at = new Date().toISOString();

    // Validate
    const validation = validateEntityData(entityData);
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
    }

    // Write JSON file
    const filePath = writeEntityFile(entityData);

    // Write MDX files if body content provided
    if (body_en !== undefined) writeMdxFile(id, 'en', body_en || '');
    if (body_zh !== undefined) writeMdxFile(id, 'zh-Hans', body_zh || '');

    // Re-ingest into DB
    const ingestResult = await ingestSingleEntity(filePath);
    if (!ingestResult.success) {
      return NextResponse.json(
        { error: 'Ingestion failed', details: ingestResult.errors },
        { status: 500 }
      );
    }

    auditLog('entity.update', { entityId: id, entityType: entityData.type });
    return NextResponse.json({ ok: true, updated_at: entityData.updated_at });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE — delete entity
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireAdminSession(_request);
  if (authError) return authError;
  try {
    const { id } = await params;

    // Get entity type before deletion
    const entity = getEntityById(id);
    if (!entity) {
      return NextResponse.json({ error: 'Entity not found' }, { status: 404 });
    }

    // Delete from DB first (atomic transaction, rollback-safe)
    deleteEntityFromDb(id);

    // Then clean up files
    deleteEntityFiles(id, entity.type);
    removeEntityEdgesFromFile(id);

    auditLog('entity.delete', { entityId: id, entityType: entity.type });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET — get single entity
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireAdminSession(_request);
  if (authError) return authError;
  try {
    const { id } = await params;
    const entity = getEntityById(id);
    if (!entity) {
      return NextResponse.json({ error: 'Entity not found' }, { status: 404 });
    }
    return NextResponse.json(entity);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
