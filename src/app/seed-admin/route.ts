/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/features/ordering/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const adminEmail = 'admin@taj.com';
        const password = 'password123';

        // 1. Get or Create Auth User
        const { data: users, error: authListErr } = await supabaseAdmin.auth.admin.listUsers();
        if (authListErr) throw new Error(authListErr.message);

        let authId = '';
        const adminAuthUser = users.users.find(u => u.email === adminEmail);

        if (adminAuthUser) {
            authId = adminAuthUser.id;
            await supabaseAdmin.auth.admin.updateUserById(authId, { password, email_confirm: true });
        } else {
            const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
                email: adminEmail,
                password: password,
                email_confirm: true,
            });
            if (createErr) throw createErr;
            authId = newUser.user.id;
        }

        // 2. Fetch or Create Admin Role
        let roleId = '';
        const { data: roles, error: rolesErr } = await supabaseAdmin
            .from('roles')
            .select('id')
            .eq('name', 'admin')
            .single();

        if (roles) {
            roleId = roles.id;
        } else {
            const { data: newRole, error: roleInsErr } = await supabaseAdmin
                .from('roles')
                .insert([{ name: 'admin' }])
                .select()
                .single();

            if (roleInsErr) throw new Error(`Role init failed: ${roleInsErr.message}`);
            roleId = newRole.id;
        }

        // 3. Upsert into staff_users
        const { data: existingStaff } = await supabaseAdmin
            .from('staff_users')
            .select('id')
            .eq('auth_id', authId)
            .single();

        if (existingStaff) {
            const { error: staffUpdErr } = await supabaseAdmin
                .from('staff_users')
                .update({ role_id: roleId, is_active: true })
                .eq('id', existingStaff.id);
            if (staffUpdErr) throw new Error(`Staff update failed: ${staffUpdErr.message}`);
        } else {
            const { error: staffErr } = await supabaseAdmin
                .from('staff_users')
                .insert([{
                    auth_id: authId,
                    role_id: roleId,
                    name: 'Super Admin',
                    phone: '1234567890',
                    is_active: true
                }]);
            if (staffErr) throw new Error(`Staff mapping failed: ${staffErr.message}`);
        }

        return NextResponse.json({
            success: true,
            message: 'Local Admin successfully provisioned! Table links established.',
            email: adminEmail,
            password: password,
            roleId: roleId
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
