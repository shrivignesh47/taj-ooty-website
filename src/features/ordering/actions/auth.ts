 

"use server";

import { createSupabaseServerClient } from '../lib/supabaseServer';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabaseAdminEdge = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function verifyStaff() {
    const supabase = await createSupabaseServerClient();
    let user = null;
    try {
        const { data } = await supabase.auth.getUser();
        user = data?.user ?? null;
    } catch (_) {
        user = null;
    }
    if (!user) return { success: false };

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
        .eq('auth_id', user.id)
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
            authId: user.id,
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

        const supabase = await createSupabaseServerClient();
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return { error: error.message };
        }

        // Permission-based routing — honour admin's role assignments, not hardcoded role names
        let user = null;
        try {
            const { data } = await supabase.auth.getUser();
            user = data?.user ?? null;
        } catch (_) {
            user = null;
        }
        if (user) {
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
                .eq('auth_id', user.id)
                .single();

            const roleData = staffMember?.roles as { name?: string; role_permissions?: { permissions?: { key: string } }[] } | null | undefined;
            const roleName = roleData?.name?.toLowerCase() ?? '';
            const permSet = new Set<string>();

            if (roleName === 'admin') {
                // Admin gets all permissions
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
            if (roleName === 'admin') {
                return { success: true, redirectUrl: '/staff/admin' };
            }
            if (roleName === 'cashier') {
                return { success: true, redirectUrl: '/staff/billing' };
            }
            if (roleName === 'waiter') {
                return { success: true, redirectUrl: '/staff/orders' };
            }
            if (roleName === 'kitchen') {
                return { success: true, redirectUrl: '/staff/kitchen' };
            }

            // Fallback to permission-based routing
            if (permSet.has('manage_staff') || permSet.has('view_revenue') || permSet.has('manage_roles')) {
                return { success: true, redirectUrl: '/staff/admin' };
            }
            if (permSet.has('view_kitchen_queue') || permSet.has('update_prep_status')) {
                return { success: true, redirectUrl: '/staff/kitchen' };
            }
            if (permSet.has('view_billing') || permSet.has('generate_bills')) {
                return { success: true, redirectUrl: '/staff/billing' };
            }
            if (permSet.has('view_orders') || permSet.has('confirm_orders') || permSet.has('edit_orders')) {
                return { success: true, redirectUrl: '/staff/orders' };
            }
        }

        return { success: true, redirectUrl: '/staff/billing' }; // Changed default to billing/orders rather than station hub
    } catch (e: unknown) {
        return { error: e instanceof Error ? e.message : 'Internal error during login' };
    }
}

export async function logoutStaff() {
    const supabase = await createSupabaseServerClient();
    let user = null;
    try {
        const { data } = await supabase.auth.getUser();
        user = data?.user ?? null;
    } catch (_) {
        user = null;
    }
    if (user) {
        const { data: staffMember } = await supabaseAdminEdge
            .from('staff_users')
            .select('id')
            .eq('auth_id', user.id)
            .single();
        if (staffMember?.id) {
            await supabaseAdminEdge.from('staff_activity_log').insert({
                staff_id: staffMember.id,
                action: 'LOGOUT',
                details: { trigger: 'user_action' }
            });
        }
    }
    await supabase.auth.signOut();
    redirect('/staff/login');
}
