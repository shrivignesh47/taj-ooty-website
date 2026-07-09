require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
    console.log("Seeding Admin account...");
    const email = 'admin@taj.com';
    const password = 'password123';

    // 1. Auth Account
    let authId = '';
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    console.log("Existing Users:", existingUser.users.length);
    const user = existingUser.users.find(u => u.email === email);

    if (user) {
        authId = user.id;
        await supabase.auth.admin.updateUserById(authId, { password, email_confirm: true });
        console.log("Updated Auth!");
    } else {
        const { data: newUser, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
        if (error) throw error;
        authId = newUser.user.id;
        console.log("Created Auth!");
    }

    // 2. Roles
    let roleId = '';
    const { data: existingRole, error: roleSearchErr } = await supabase.from('roles').select('id').ilike('name', 'admin').single();
    if (existingRole) {
        roleId = existingRole.id;
    } else {
        const { data: newRole, error: roleError } = await supabase.from('roles').insert({ name: 'admin' }).select('id').single();
        if (roleError) {
            console.error("Role insertion failed:", roleError);
            throw roleError;
        }
        roleId = newRole.id;
        console.log("Created 'admin' role!");
    }

    // 3. Staff Member
    const { data: existingStaff } = await supabase.from('staff_users').select('id').eq('auth_id', authId).single();
    if (existingStaff) {
        const { error: updErr } = await supabase.from('staff_users').update({ role_id: roleId, is_active: true }).eq('id', existingStaff.id);
        if (updErr) throw updErr;
        console.log("Updated Staff User!");
    } else {
        const { error: insErr } = await supabase.from('staff_users').insert({ auth_id: authId, role_id: roleId, name: 'Super Admin', phone: '1234567890', is_active: true });
        if (insErr) {
            console.error("Staff insertion failed:", insErr);
            throw insErr;
        }
        console.log("Created Staff User!");
    }
}
run().catch(console.error);
