import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/features/ordering/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // 1. Get or create role
        let { data: role } = await supabaseAdmin.from('roles').select('id').eq('name', 'Admin').single();
        if (!role) {
            const { data: newRole } = await supabaseAdmin.from('roles').insert([{ name: 'Admin', is_custom: false }]).select().single();
            role = newRole;
        }

        // 2. Get auth user
        const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
        const adminUser = authUsers.users.find((u: any) => u.email === 'admin@tajooty.com');

        // 3. Fix staff_user mapping
        const { data: existing } = await supabaseAdmin.from('staff_users').select('id').eq('auth_id', adminUser!.id).single();
        if (existing) {
            await supabaseAdmin.from('staff_users').update({ role_id: role!.id, name: 'Super Admin', is_active: true }).eq('id', existing.id);
        } else {
            await supabaseAdmin.from('staff_users').insert([{ auth_id: adminUser!.id, role_id: role!.id, name: 'Super Admin', phone: '1234567890', is_active: true }]);
        }

        return NextResponse.json({ success: true, message: 'Admin fixed successfully!' });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
