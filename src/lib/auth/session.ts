import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from './index';

export const SESSION_COOKIE = 'ek-admin-session';

export async function getSessionFromCookies(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  return validateSession(token);
}

/**
 * Validates the admin session from a NextRequest cookie.
 * Returns null if authenticated, or a 401 NextResponse if not.
 */
export function requireAdminSession(request: NextRequest): NextResponse | null {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token || !validateSession(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
