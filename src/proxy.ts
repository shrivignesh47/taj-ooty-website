import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_NAME, USER_ID_HEADER, decodeJwtPayload } from './lib/authCookie';



export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Clone the original request headers. Never trust identity values sent by the
  // client — strip them here and set sanitized ones after JWT validation below.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete('x-taj-user-id');

  let response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Strip any accidental surrounding quotes from env vars (Windows .env.local quirk)
  const supabaseUrl  = (process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '').replace(/^"|"$/g, '').trim();
  const supabaseAnon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').replace(/^"|"$/g, '').trim();
  const serviceRole  = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').replace(/^"|"$/g, '').trim();

  if (!supabaseUrl || !supabaseAnon) {
    return response;
  }

  // ── Only run auth/RBAC logic on staff routes ─────────────────────────────
  const isStaffRoute = pathname.startsWith('/staff');
  if (!isStaffRoute) return response;

  const isLoginRoute = pathname === '/staff/login' || pathname.startsWith('/staff/login/');

  // ── 1. Read auth token from cookie ────────────────────────────────────────
  const token = request.cookies.get(COOKIE_NAME)?.value ?? '';

  let userId: string | null = null;
  if (token) {
    const payload = decodeJwtPayload(token);
    if (payload && typeof payload.sub === 'string') {
      const exp = typeof payload.exp === 'number' ? payload.exp * 1000 : Infinity;
      if (exp > Date.now()) {
        userId = payload.sub;
      }
    }
  }

  // ── 2. Unauthenticated → redirect to login ────────────────────────────────
  if (!userId) {
    if (isLoginRoute) return response;
    const loginUrl = new URL('/staff/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── 3. Authenticated — check if account is active ─────────────────────────
  let isActive = true;

  if (serviceRole) {
    try {
      const admin = createClient(supabaseUrl, serviceRole);
      const { data: staffMember } = await admin
        .from('staff_users')
        .select('is_active')
        .eq('auth_id', userId)
        .single();

      if (staffMember) {
        isActive = staffMember.is_active ?? true;
      }
    } catch {
      // DB unreachable — fail open, let page-level auth handle it
    }
  }

  // ── 4. Deactivated account → clear cookie and redirect ────────────────────
  if (!isActive) {
    const res = NextResponse.redirect(new URL('/staff/login?error=AccountDisabled', request.url));
    res.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' });
    return res;
  }

  // ── 5. Authenticated → forward validated identity to the page ──────────────
  // Server Components read this header via `headers()` instead of relying on
  // cookie propagation which Vercel's split proxy→page functions was losing.
  // Role-based redirects are handled by the pages themselves — proxy no longer
  // redirects on role mismatch to avoid competing 307s and redirect loops.
  requestHeaders.set(USER_ID_HEADER, userId);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     * - _next/static (static assets)
     * - _next/image  (image optimisation)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
