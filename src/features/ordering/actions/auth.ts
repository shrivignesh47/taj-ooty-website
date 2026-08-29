
"use server";

import { getAuthUserId, createAuthClient, COOKIE_NAME } from '../lib/supabaseServer';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const supabaseAdminEdge = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function verifyStaff() {
    const userId = await getAuthUserId();
    if (!userId) return { success: false };

    const { data: staffMember } = await supabaseAdminEdge
        .from('staff_users')
        .select(`
            id,
            name, 
            roles (
                name,
                role_permissions (
                    permissions (
                        key
                    )
                )
            )
        `)
        .eq('auth_id', userId)
        .single();

    if (!staffMember) return { success: false };

    const roleData = staffMember.roles as { name?: string; role_permissions?: { permissions?: { key: string } }[] } | null | undefined;
    const permissions = new Set<string>();

    if (roleData?.role_permissions) {
        roleData.role_permissions.forEach((rp: { permissions?: { key: string } }) => {
            if (rp.permissions?.key) permissions.add(rp.permissions.key);
        });
    }

    // Default admin override
    if (roleData?.name?.toLowerCase() === 'admin') {
        const allPerms = await supabaseAdminEdge.from('permissions').select('key');
        allPerms.data?.forEach(p => permissions.add(p.key));
    }

    return {
        success: true,
        user: {
            id: staffMember.id,
            authId: userId,
            name: staffMember.name,
            roleName: roleData?.name || 'Unknown',
            permissions: Array.from(permissions)
        }
    };
}

export async function loginStaff(formData: FormData) {
    try {
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;

        if (!email || !password) {
            return { error: 'Missing email or password' };
        }

        const supabase = createAuthClient();
        const { data: signInData, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return { error: error.message };
        }

        const accessToken = signInData.session?.access_token;
        if (!accessToken) {
            return { error: 'No session returned' };
        }

        // Set the auth cookie via Set-Cookie header (server-side) so it is
        // immediately available to middleware AND Server Components.
        const cookieStore = await cookies();
        cookieStore.set(COOKIE_NAME, accessToken, {
            path: '/',
            sameSite: 'lax',
            maxAge: 12 * 60 * 60, // 12 hours
        });

        // Decode JWT to get user ID for role lookup
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        const userId: string = payload.sub;

        // Permission-based routing — honour admin's role assignments
        const { data: staffMember } = await supabaseAdminEdge
            .from('staff_users')
            .select(`
                id,
                roles (
                    name,
                    role_permissions (
                        permissions ( key )
                    )
                )
            `)
            .eq('auth_id', userId)
            .single();

        const roleData = staffMember?.roles as { name?: string; role_permissions?: { permissions?: { key: string } }[] } | null | undefined;
        const roleName = roleData?.name?.toLowerCase() ?? '';
        const permSet = new Set<string>();

        if (roleName === 'admin') {
            const { data: allPerms } = await supabaseAdminEdge.from('permissions').select('key');
            allPerms?.forEach(p => permSet.add(p.key));
        } else if (roleData?.role_permissions) {
            roleData.role_permissions.forEach((rp: { permissions?: { key: string } }) => {
                if (rp.permissions?.key) permSet.add(rp.permissions.key);
            });
        }

        if (staffMember?.id) {
            try {
                await supabaseAdminEdge.from('staff_activity_log').insert({
                    staff_id: staffMember.id,
                    action: 'LOGIN',
                    details: { method: 'password', role: roleName }
                });
            } catch { /* non-critical log failure */ }
        }

        // Route by role name first (direct match)
        if (roleName === 'admin')    return { success: true, accessToken, redirectUrl: '/staff/admin' };
        if (roleName === 'cashier')  return { success: true, accessToken, redirectUrl: '/staff/billing' };
        if (roleName === 'waiter')   return { success: true, accessToken, redirectUrl: '/staff/orders' };
        if (roleName === 'kitchen')  return { success: true, accessToken, redirectUrl: '/staff/kitchen' };

        // Fallback to permission-based routing
        if (permSet.has('manage_staff') || permSet.has('view_revenue') || permSet.has('manage_roles'))
            return { success: true, accessToken, redirectUrl: '/staff/admin' };
        if (permSet.has('view_kitchen_queue') || permSet.has('update_prep_status'))
            return { success: true, accessToken, redirectUrl: '/staff/kitchen' };
        if (permSet.has('view_billing') || permSet.has('generate_bills'))
            return { success: true, accessToken, redirectUrl: '/staff/billing' };
        if (permSet.has('view_orders') || permSet.has('confirm_orders') || permSet.has('edit_orders'))
            return { success: true, accessToken, redirectUrl: '/staff/orders' };

        return { success: true, accessToken, redirectUrl: '/staff/billing' };
    } catch (e: unknown) {
        return { error: e instanceof Error ? e.message : 'Internal error during login' };
    }
}

export async function logoutStaff() {
    const userId = await getAuthUserId();

    if (userId) {
        const { data: staffMember } = await supabaseAdminEdge
            .from('staff_users')
            .select('id')
            .eq('auth_id', userId)
            .single();
        if (staffMember?.id) {
            await supabaseAdminEdge.from('staff_activity_log').insert({
                staff_id: staffMember.id,
                action: 'LOGOUT',
                details: { trigger: 'user_action' }
            });
        }
    }

    // Clear the auth cookie
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, '', { maxAge: 0, path: '/' });

    redirect('/staff/login');
}
