/* eslint-disable @typescript-eslint/no-explicit-any */
 
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
            // Already logged in — redirect to the most relevant page based on permissions
            const supabaseAdminEdge = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
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
        }

        if (user && !isLoginRoute) {
            // Fully Verify Staff Identity against DB
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
