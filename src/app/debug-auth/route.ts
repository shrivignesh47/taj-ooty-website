import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/features/ordering/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
        const { data: staffUsers } = await supabaseAdmin.from('staff_users').select('*');
        const { data: roles } = await supabaseAdmin.from('staff_roles').select('*');

        return NextResponse.json({
            authUsers: authUsers.users.map(u => ({ email: u.email, id: u.id })),
            staffUsers,
            roles
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
