import { NextRequest, NextResponse } from 'next/server';
import { ulid } from 'ulid';
import { validateEntityData } from '@/lib/ingestion/validator';
import { ingestSingleEntity } from '@/lib/ingestion/pipeline';
import { writeEntityFile, writeMdxFile } from '@/lib/admin/file-writer';
import { applyEntityDefaults } from '@/lib/admin/entity-defaults';
import { listEntities } from '@/lib/db/queries';
import { auditLog } from '@/lib/audit';
import { requireAdminSession } from '@/lib/auth/session';

// GET — list entities (reuses existing query layer)
export async function GET(request: NextRequest) {
  const authError = requireAdminSession(request);
  if (authError) return authError;
  try {
    const url = request.nextUrl;
    const type = url.searchParams.get('type') || undefined;
    const status = url.searchParams.get('status') || undefined;
    const search = url.searchParams.get('search') || undefined;
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const sort = url.searchParams.get('sort') || undefined;
    const sortDir = (url.searchParams.get('sortDir') as 'asc' | 'desc') || undefined;

    const result = listEntities(type, { status, search, page, limit, sort, sortDir });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST — create entity
export async function POST(request: NextRequest) {
  const authError = requireAdminSession(request);
  if (authError) return authError;
  try {
    const body = await request.json();
    const { entity: entityData, body_en, body_zh } = body;

    if (!entityData || typeof entityData !== 'object') {
      return NextResponse.json({ error: 'Entity data required' }, { status: 400 });
    }

    // Generate ID if not provided
    if (!entityData.id) {
      entityData.id = ulid().toLowerCase();
    }

    // Set timestamps
    const now = new Date().toISOString();
    if (!entityData.created_at) entityData.created_at = now;
    entityData.updated_at = now;

    // Auto-populate required fields with sensible defaults before validation.
    // This lets the form send only user-provided fields while the API fills in
    // the rest (empty arrays, stub IDs, etc.) so Zod validation passes.
    applyEntityDefaults(entityData);

    // For note type, auto-create an MDX stub so body_mdx_id resolves
    if (entityData.type === 'note' && entityData.body_mdx_id) {
      const stubExists = body_en || body_zh;
      if (!stubExists) {
        writeMdxFile(entityData.id, 'en', '');
      }
    }

    // Validate against the full Zod schema
    const validation = validateEntityData(entityData);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 },
      );
    }

    // Write JSON file
    const filePath = writeEntityFile(entityData);

    // Write MDX files if body content provided
    if (body_en) writeMdxFile(entityData.id, 'en', body_en);
    if (body_zh) writeMdxFile(entityData.id, 'zh-Hans', body_zh);

    // Ingest into DB
    const ingestResult = await ingestSingleEntity(filePath);
    if (!ingestResult.success) {
      return NextResponse.json(
        { error: 'Ingestion failed', details: ingestResult.errors },
        { status: 500 },
      );
    }

    auditLog('entity.create', { entityId: entityData.id, entityType: entityData.type });
    return NextResponse.json({ ok: true, id: entityData.id }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
