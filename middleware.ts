import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'ek-admin-session';

// Session tokens are 32 random bytes encoded as hex (64 chars)
const VALID_TOKEN_RE = /^[0-9a-f]{64}$/;

function isValidTokenFormat(token: string): boolean {
  return VALID_TOKEN_RE.test(token);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Root path → redirect to locale based on Accept-Language
  if (pathname === '/') {
    const acceptLang = request.headers.get('accept-language') || '';
    const locale = /zh/i.test(acceptLang) ? 'zh-Hans' : 'en';
    return NextResponse.redirect(new URL(`/${locale}`, request.url));
  }

  // Match /en/admin/* or /zh-Hans/admin/* but NOT /*/admin/login
  const adminMatch = pathname.match(/^\/(en|zh-Hans)\/admin(\/.*)?$/);
  if (!adminMatch) return NextResponse.next();

  const subPath = adminMatch[2] || '';

  // Allow login page through
  if (subPath === '/login' || subPath.startsWith('/login/')) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const validToken = !!token && isValidTokenFormat(token);

  // Authenticated API routes — auth check + CSRF
  const isAdminApi = pathname.startsWith('/api/admin/');
  const isProtectedApi = pathname.startsWith('/api/backup') || pathname.startsWith('/api/export');
  if (isAdminApi || isProtectedApi) {
    if (pathname.startsWith('/api/admin/auth')) {
      return NextResponse.next();
    }
    if (!validToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // CSRF: require custom header on state-changing requests
    const method = request.method;
    if (method !== 'GET' && method !== 'HEAD') {
      if (request.headers.get('x-requested-with') !== 'XMLHttpRequest') {
        return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
      }
    }
    return NextResponse.next();
  }

  // Admin pages — redirect to login if no valid cookie
  if (!validToken) {
    const locale = adminMatch[1];
    const loginUrl = new URL(`/${locale}/admin/login`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/:locale(en|zh-Hans)/admin',
    '/:locale(en|zh-Hans)/admin/:path*',
    '/api/admin/:path*',
    '/api/backup/:path*',
    '/api/export/:path*',
  ],
};
