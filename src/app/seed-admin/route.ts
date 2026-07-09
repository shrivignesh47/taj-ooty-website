import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/features/ordering/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const adminEmail = 'admin@tajooty.com';

        // 1. Get existing auth ID
        const { data: users, error: authErr } = await supabaseAdmin.auth.admin.listUsers();
        if (authErr) throw new Error(authErr.message);

        const adminAuthUser = users.users.find(u => u.email === adminEmail);
        if (!adminAuthUser) {
            return NextResponse.json({ error: 'Auth user not found.' });
        }

        const authId = adminAuthUser.id;

        // 2. Fetch the "admin" role ID from staff_roles
        const { data: roles } = await supabaseAdmin
            .from('staff_roles')
            .select('id')
            .eq('role_name', 'admin')
            .single();

        let roleId = roles?.id;

        if (!roleId) {
            const { data: newRole } = await supabaseAdmin
                .from('staff_roles')
                .insert([{ role_name: 'admin', permissions: { all: true } }])
                .select()
                .single();
            roleId = newRole?.id;
        }

        // 3. Upsert into staff_users (by matching auth_id if possible, or just insert)
        const { data: existingStaff } = await supabaseAdmin
            .from('staff_users')
            .select('id')
            .eq('auth_id', authId)
            .single();

        if (existingStaff) {
            await supabaseAdmin
                .from('staff_users')
                .update({ role_id: roleId, is_active: true })
                .eq('id', existingStaff.id);
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

        return NextResponse.json({ success: true, message: 'Admin rigorously fixed in staff_users' });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
