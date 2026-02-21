import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, getPasswordHash, createSession, destroySession, validateSession, isSetupRequired } from '@/lib/auth';
import { SESSION_COOKIE } from '@/lib/auth/session';
import { auditLog } from '@/lib/audit';

// ─── Rate limiter (in-memory, per-IP) ────────────────────────────────────────
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
let lastPurge = Date.now();
const PURGE_INTERVAL = 60_000; // purge at most once per minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  // Purge expired entries periodically
  if (now - lastPurge > PURGE_INTERVAL && attempts.size > 0) {
    lastPurge = now;
    for (const [key, val] of attempts) {
      if (now > val.resetAt) attempts.delete(key);
    }
  }
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > MAX_ATTEMPTS;
}

function clearRateLimit(ip: string) {
  attempts.delete(ip);
}

function buildCookieString(token: string, secure: boolean): string {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${24 * 60 * 60}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

// GET — check authentication status + setup state
export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const authenticated = !!token && validateSession(token);
  return NextResponse.json({ authenticated, setupRequired: isSetupRequired() });
}

// POST — login with password
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many login attempts. Try again later.' },
        { status: 429 }
      );
    }

    const { password } = await request.json();
    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password required' }, { status: 400 });
    }

    const hash = getPasswordHash();
    if (!hash) {
      return NextResponse.json({ error: 'No password configured. Use setup endpoint.' }, { status: 403 });
    }

    if (!verifyPassword(password, hash)) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    clearRateLimit(ip);
    const token = createSession();
    const host = request.headers.get('host') || '';
    const isPrivateNetwork = host.startsWith('localhost')
      || host.startsWith('127.')
      || host.startsWith('10.')
      || host.startsWith('192.168.')
      || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
    const isSecure = process.env.NODE_ENV === 'production' && !isPrivateNetwork;

    auditLog('auth.login', { ip });

    const response = NextResponse.json({ ok: true });
    // Use explicit Set-Cookie header for maximum compatibility
    response.headers.append('Set-Cookie', buildCookieString(token, isSecure));

    return response;
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE — logout
export async function DELETE(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    destroySession(token);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
