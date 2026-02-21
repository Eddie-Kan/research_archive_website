import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/index';
import { semanticSearch, getSemanticSearchStatus } from '@/lib/search/semantic';

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const query = params.get('query');
    const db = getDb();

    if (!query) {
      return NextResponse.json(getSemanticSearchStatus(db));
    }

    const result = await semanticSearch(db, {
      query,
      type: params.get('type') || undefined,
      visibility: params.get('visibility') || undefined,
      limit: parseInt(params.get('limit') || '10'),
      threshold: parseFloat(params.get('threshold') || '0.3'),
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
