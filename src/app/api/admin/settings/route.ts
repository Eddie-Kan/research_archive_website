import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, getPasswordHash, hashPassword, setPasswordHash, destroyAllSessions } from '@/lib/auth';
import { SESSION_COOKIE, requireAdminSession } from '@/lib/auth/session';
import { auditLog } from '@/lib/audit';

// PUT — change password
export async function PUT(request: NextRequest) {
  const authError = requireAdminSession(request);
  if (authError) return authError;
  try {
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Both current and new password required' }, { status: 400 });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
    }

    const hash = getPasswordHash();
    if (!hash) {
      return NextResponse.json({ error: 'No password configured' }, { status: 403 });
    }

    if (!verifyPassword(currentPassword, hash)) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
    }

    const newHash = hashPassword(newPassword);
    setPasswordHash(newHash);

    // Invalidate all other sessions, keep current one
    const currentToken = request.cookies.get(SESSION_COOKIE)?.value;
    destroyAllSessions(currentToken);

    auditLog('auth.password_change');
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
