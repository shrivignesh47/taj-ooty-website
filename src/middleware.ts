/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    // If a cookie is updated, update the response
                    request.cookies.set({ name, value, ...options });
                    response = NextResponse.next({
                        request: { headers: request.headers },
                    });
                    response.cookies.set({ name, value, ...options });
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({ name, value: '', ...options });
                    response = NextResponse.next({
                        request: { headers: request.headers },
                    });
                    response.cookies.set({ name, value: '', ...options });
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();

    const isStaffRoute = request.nextUrl.pathname.startsWith('/staff');
    const isLoginRoute = request.nextUrl.pathname.startsWith('/staff/login');

    // RBAC Gateway Block
    if (isStaffRoute) {
        if (!user && !isLoginRoute) {
            // Redirect unauthenticated off the staff portal
            return NextResponse.redirect(new URL('/staff/login', request.url));
        }

        if (user && isLoginRoute) {
            // Already logged in, redirect them to their specific role dashboard

            const supabaseAdminEdge = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
            const { data: staffMember } = await supabaseAdminEdge
                .from('staff_users')
                .select('roles(name)')
                .eq('auth_id', user.id)
                .single();

            const roleName = (staffMember?.roles as any)?.name?.toLowerCase();
            let dest = '/staff/dashboard'; // fallback
            if (roleName === 'admin') dest = '/staff/admin';
            else if (roleName === 'waiter') dest = '/staff/orders';
            else if (roleName === 'kitchen') dest = '/staff/kitchen';
            else if (roleName === 'cashier') dest = '/staff/billing';

            return NextResponse.redirect(new URL(dest, request.url));
        }

        if (user && !isLoginRoute) {
            // Fully Verify Staff Identity against DB
            const { createClient } = require('@supabase/supabase-js');
            const supabaseAdminEdge = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            const { data: staffMember, error } = await supabaseAdminEdge
                .from('staff_users')
                .select('is_active, roles(name)')
                .eq('auth_id', user.id)
                .single();

            if (error || !staffMember || !staffMember.is_active) {
                await supabase.auth.signOut();
                return NextResponse.redirect(new URL('/staff/login?error=UnauthorizedAccess', request.url));
            }

            // In a production app, we would also verify if roleName has access to the current request.nextUrl.pathname
        }
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
