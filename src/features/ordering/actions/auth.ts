/* eslint-disable @typescript-eslint/no-require-imports */
"use server";

import { createSupabaseServerClient } from '../lib/supabaseServer';
import { redirect } from 'next/navigation';

export async function loginStaff(formData: FormData) {
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
    const { createClient } = require('@supabase/supabase-js');
    const supabaseAdminEdge = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data: staffMember } = await supabaseAdminEdge
            .from('staff_users')
            .select('roles(name)')
            .eq('auth_id', user.id)
            .single();

        const roleName = (staffMember?.roles as any)?.name?.toLowerCase();
        if (roleName === 'admin') redirect('/staff/admin');
        if (roleName === 'waiter') redirect('/staff/orders');
        if (roleName === 'kitchen') redirect('/staff/kitchen');
        if (roleName === 'cashier') redirect('/staff/billing');
    }

    redirect('/staff/dashboard');
}

export async function logoutStaff() {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    redirect('/staff/login');
}
