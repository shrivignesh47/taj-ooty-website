import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Only protect staff dashboard routes
    const isStaffRoute = pathname.startsWith('/staff') && !pathname.startsWith('/staff/login');
    const isLoginPage = pathname === '/staff/login';

    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/^"/, '').replace(/"$/, '').trim();
    const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').replace(/^"/, '').replace(/"$/, '').trim();

    if (!supabaseUrl || !supabaseAnonKey) {
        return response;
    }

    const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({ name, value, ...options });
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    response.cookies.set({ name, value, ...options });
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({ name, value: '', ...options });
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    response.cookies.set({ name, value: '', ...options });
                },
            },
        }
    );

    // Refresh auth session
    let user = null;
    try {
        const { data } = await supabase.auth.getUser();
        user = data?.user ?? null;
    } catch (_) {
        user = null;
    }

    // Check custom PIN/staff cookies if Supabase auth cookie is not present
    const hasStaffCookie = Boolean(
        request.cookies.get('taj_staff_session')?.value ||
        request.cookies.get('staff_user')?.value ||
        request.cookies.get('staff_id')?.value
    );

    const isAuthenticated = Boolean(user || hasStaffCookie);

    // 1. Unauthenticated user trying to access staff pages -> Redirect to /staff/login
    if (isStaffRoute && !isAuthenticated) {
        const redirectUrl = new URL('/staff/login', request.url);
        redirectUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(redirectUrl);
    }

    // 2. Authenticated user visiting /staff/login -> Redirect to staff dashboard
    if (isLoginPage && isAuthenticated) {
        return NextResponse.redirect(new URL('/staff/orders', request.url));
    }

    return response;
}

export const config = {
    matcher: [
        '/staff/:path*',
    ],
};
