import { NextRequest, NextResponse } from 'next/server';
import { writeMdxFile } from '@/lib/admin/file-writer';
import { ingestSingleEntity } from '@/lib/ingestion/pipeline';
import { getEntityById } from '@/lib/db/queries';
import { getEntityFilePath } from '@/lib/admin/file-writer';
import { requireAdminSession } from '@/lib/auth/session';

// PUT — update MDX body for a specific locale
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireAdminSession(request);
  if (authError) return authError;
  try {
    const { id } = await params;
    const { locale, content } = await request.json();

    if (!locale || !['en', 'zh-Hans'].includes(locale)) {
      return NextResponse.json({ error: 'Valid locale required (en or zh-Hans)' }, { status: 400 });
    }

    if (typeof content !== 'string') {
      return NextResponse.json({ error: 'Content must be a string' }, { status: 400 });
    }

    const entity = getEntityById(id);
    if (!entity) {
      return NextResponse.json({ error: 'Entity not found' }, { status: 404 });
    }

    // Write MDX file
    writeMdxFile(id, locale, content);

    // Re-ingest to update DB body fields
    const filePath = getEntityFilePath(id, entity.type);
    const ingestResult = await ingestSingleEntity(filePath);
    if (!ingestResult.success) {
      return NextResponse.json(
        { error: 'Re-ingestion failed', details: ingestResult.errors },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
