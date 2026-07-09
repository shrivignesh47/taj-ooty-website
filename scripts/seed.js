require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminAuth = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
    const email = 'admin@taj.com';
    const password = 'password123';

    let authId = '';
    const { data: existingUser } = await adminAuth.auth.admin.listUsers();
    const user = existingUser.users.find(u => u.email === email);

    if (user) {
        authId = user.id;
        await adminAuth.auth.admin.updateUserById(authId, { password, email_confirm: true });
    } else {
        const { data: newUser } = await adminAuth.auth.admin.createUser({ email, password, email_confirm: true });
        authId = newUser.user.id;
    }

    let roleId = '';
    const { data: existingRole } = await adminAuth.from('staff_roles').select('id').ilike('role_name', 'admin').single();
    if (existingRole) { roleId = existingRole.id; }
    else {
        const { data: newRole } = await adminAuth.from('staff_roles').insert({ role_name: 'admin', permissions: { all: true } }).select('id').single();
        roleId = newRole.id;
    }

    const { data: staffMember } = await adminAuth.from('staff_users').select('id').eq('auth_id', authId).single();
    if (staffMember) {
        await adminAuth.from('staff_users').update({ role_id: roleId, is_active: true }).eq('id', staffMember.id);
    } else {
        await adminAuth.from('staff_users').insert({ auth_id: authId, role_id: roleId, name: 'Local Admin', phone: '1234567890', is_active: true });
    }
    console.log('SUCCESS');
}
run().catch(console.error);
