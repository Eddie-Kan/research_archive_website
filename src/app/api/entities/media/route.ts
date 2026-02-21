import { NextRequest, NextResponse } from 'next/server';
import { getEntityService } from '@/domain/services/entity.service';
import { requireAdminSession } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  const authError = requireAdminSession(request);
  if (authError) return authError;
  try {
    return NextResponse.json(getEntityService().listMedia());
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
