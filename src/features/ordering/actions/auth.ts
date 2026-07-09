/* eslint-disable @typescript-eslint/no-explicit-any */

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false };

    const { data: staffMember } = await supabaseAdminEdge
        .from('staff_users')
        .select(`
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

    const roleData: any = staffMember.roles;
    const permissions = new Set<string>();

    if (roleData?.role_permissions) {
        roleData.role_permissions.forEach((rp: any) => {
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
            id: user.id,
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

        // Role-based routing directly post-login to skip the dashboard hub for specific roles
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: staffMember } = await supabaseAdminEdge
                .from('staff_users')
                .select('roles(name)')
                .eq('auth_id', user.id)
                .single();

            const roleName = (staffMember?.roles as any)?.name?.toLowerCase();
            if (roleName === 'admin') return { success: true, redirectUrl: '/staff/admin' };
            if (roleName === 'waiter') return { success: true, redirectUrl: '/staff/orders' };
            if (roleName === 'kitchen') return { success: true, redirectUrl: '/staff/kitchen' };
            if (roleName === 'cashier') return { success: true, redirectUrl: '/staff/billing' };
        }

        return { success: true, redirectUrl: '/staff/dashboard' };
    } catch (e: any) {
        return { error: e.message || 'Internal error during login' };
    }
}

export async function logoutStaff() {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    redirect('/staff/login');
}
