import { NextRequest, NextResponse } from 'next/server';
import { isSetupRequired, hashPassword, setPasswordHash } from '@/lib/auth';

// POST — set initial password (only works when no password is configured)
export async function POST(request: NextRequest) {
  try {
    if (!isSetupRequired()) {
      return NextResponse.json({ error: 'Password already configured' }, { status: 403 });
    }

    const { password } = await request.json();
    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const hash = hashPassword(password);
    setPasswordHash(hash);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
