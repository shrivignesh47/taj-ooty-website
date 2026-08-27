import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_NAME, decodeJwtPayload } from './features/ordering/lib/supabaseServer';

// ─────────────────────────────────────────────────────────────────────────────
// Role → allowed route prefixes
// A role can access a route if ANY of its allowed prefixes matches the path.
// ─────────────────────────────────────────────────────────────────────────────
const ROLE_ROUTES: Record<string, string[]> = {
  admin:   ['/staff/admin', '/staff/dashboard'],
  cashier: ['/staff/billing', '/staff/dashboard'],
  waiter:  ['/staff/orders', '/staff/dashboard'],
  kitchen: ['/staff/kitchen', '/staff/dashboard'],
};

// Routes that every authenticated staff member can access regardless of role
const PUBLIC_STAFF_ROUTES = ['/staff/login'];

function roleAllowed(role: string, pathname: string): boolean {
  const allowed = ROLE_ROUTES[role.toLowerCase()] ?? [];
  return allowed.some((prefix) => pathname.startsWith(prefix));
}

function defaultRouteForRole(role: string): string {
  switch (role.toLowerCase()) {
    case 'admin':   return '/staff/admin';
    case 'cashier': return '/staff/billing';
    case 'kitchen': return '/staff/kitchen';
    case 'waiter':  return '/staff/orders';
    default:        return '/staff/orders';
  }
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let response = NextResponse.next({
    request: { headers: request.headers },
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

  // ── 3. Authenticated — fetch role from DB ─────────────────────────────────
  let roleName = '';
  let isActive = true;

  if (serviceRole) {
    try {
      const admin = createClient(supabaseUrl, serviceRole);
      const { data: staffMember } = await admin
        .from('staff_users')
        .select('is_active, roles(name)')
        .eq('auth_id', userId)
        .single();

      if (staffMember) {
        isActive = staffMember.is_active ?? true;
        const roleData: unknown = staffMember.roles;
        if (roleData && typeof roleData === 'object' && 'name' in roleData) {
          roleName = String((roleData as { name: string }).name).toLowerCase();
        }
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

  // ── 5. Authenticated + on login page → redirect to their dashboard ────────
  if (isLoginRoute) {
    return NextResponse.redirect(new URL(defaultRouteForRole(roleName), request.url));
  }

  // ── 6. Authenticated but wrong role for this route → redirect to their dashboard ──
  if (roleName && !roleAllowed(roleName, pathname)) {
    const dest = defaultRouteForRole(roleName);
    if (dest !== pathname) {
      return NextResponse.redirect(new URL(`${dest}?error=Unauthorized`, request.url));
    }
  }

  return response;
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
