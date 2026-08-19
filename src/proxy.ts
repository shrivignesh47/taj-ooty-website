 
 
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
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

    let user = null;
    try {
        const { data } = await supabase.auth.getUser();
        user = data?.user ?? null;
    } catch (_) {
        user = null;
    }

    const isStaffRoute = request.nextUrl.pathname.startsWith('/staff');
    const isLoginRoute = request.nextUrl.pathname.startsWith('/staff/login');

    const hasStaffCookie = Boolean(
        request.cookies.get('taj_staff_session')?.value ||
        request.cookies.get('staff_user')?.value ||
        request.cookies.get('staff_id')?.value
    );

    const isAuthenticated = Boolean(user || hasStaffCookie);

    // RBAC Gateway Block
    if (isStaffRoute) {
        if (!isAuthenticated && !isLoginRoute) {
            // Redirect unauthenticated off the staff portal
            const redirectUrl = new URL('/staff/login', request.url);
            redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
            return NextResponse.redirect(redirectUrl);
        }

        if (isAuthenticated && isLoginRoute) {
            if (user) {
                // Already logged in — redirect to the most relevant page based on permissions
            const supabaseUrlClean = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/^"/, '').replace(/"$/, '').trim();
            const supabaseServiceKeyClean = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/^"/, '').replace(/"$/, '').trim();
            const supabaseAdminEdge = createClient(
                supabaseUrlClean,
                supabaseServiceKeyClean
            );
            const { data: staffMember } = await supabaseAdminEdge
                .from('staff_users')
                .select(`
                    roles (
                        name,
                        role_permissions (
                            permissions ( key )
                        )
                    )
                `)
                .eq('auth_id', user.id)
                .single();

            const roleData: any = (staffMember as any)?.roles;
            const roleName = roleData?.name?.toLowerCase() ?? '';
            const permSet = new Set<string>();

            if (roleName === 'admin') {
                // Short-circuit: admin always goes to admin
                return NextResponse.redirect(new URL('/staff/admin', request.url));
            }

            if (roleData?.role_permissions) {
                roleData.role_permissions.forEach((rp: any) => {
                    if (rp.permissions?.key) permSet.add(rp.permissions.key);
                });
            }

            let dest = '/staff/billing'; // Changed default to billing/orders rather than station hub
            if (roleName === 'admin') {
                dest = '/staff/admin';
            } else if (roleName === 'cashier') {
                dest = '/staff/billing';
            } else if (roleName === 'waiter') {
                dest = '/staff/orders';
            } else if (roleName === 'kitchen') {
                dest = '/staff/kitchen';
            } else if (permSet.has('manage_staff') || permSet.has('view_revenue') || permSet.has('manage_roles')) {
                dest = '/staff/admin';
            } else if (permSet.has('view_kitchen_queue') || permSet.has('update_prep_status')) {
                dest = '/staff/kitchen';
            } else if (permSet.has('view_billing') || permSet.has('generate_bills')) {
                dest = '/staff/billing';
            } else if (permSet.has('view_orders') || permSet.has('confirm_orders') || permSet.has('edit_orders')) {
                dest = '/staff/orders';
            }

            return NextResponse.redirect(new URL(dest, request.url));
            } else {
                // Fallback for staff cookie authentication: redirect to default staff orders
                return NextResponse.redirect(new URL('/staff/orders', request.url));
            }
        }

        if (user && !isLoginRoute) {
            // Fully Verify Staff Identity against DB
            try {
                const supabaseUrlClean = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/^"/, '').replace(/"$/, '').trim();
                const supabaseServiceKeyClean = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/^"/, '').replace(/"$/, '').trim();
                const supabaseAdminEdge = createClient(
                    supabaseUrlClean,
                    supabaseServiceKeyClean
                );

                const { data: staffMember, error } = await supabaseAdminEdge
                    .from('staff_users')
                    .select('is_active, roles(name)')
                    .eq('auth_id', user.id)
                    .single();

                if (!error && staffMember && !staffMember.is_active) {
                    await supabase.auth.signOut();
                    return NextResponse.redirect(new URL('/staff/login?error=UnauthorizedAccess', request.url));
                }
            } catch {
                // Network error reaching DB from Edge — allow through, page-level auth will check
            }
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
