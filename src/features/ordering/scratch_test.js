const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const supabase = createClient(
    "http://localhost:54321",
    "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH",
    {
        auth: { persistSession: false },
        realtime: {
            transport: ws
        }
    }
);

async function test() {
    try {
        console.log('Logging in as cashier...');
        const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
            email: 'admin@taj.com',
            password: 'password123'
        });
        if (loginErr) {
            console.error('Login error:', loginErr);
            return;
        }
        console.log('Logged in successfully. User ID:', loginData.user.id);

        console.log('Fetching staff users with full nested query...');
        const { data: staff, error: staffErr } = await supabase
            .from('staff_users')
            .select(`
                id,
                name,
                auth_id,
                roles (
                    name,
                    role_permissions (
                        permissions (
                            key
                        )
                    )
                )
            `)
            .eq('auth_id', loginData.user.id)
            .single();
        
        if (staffErr) {
            console.error('Fetch staff error:', staffErr);
        } else {
            console.log('Staff data:', JSON.stringify(staff, null, 2));
        }

        console.log('Fetching roles...');
        const { data: roles, error: rolesErr } = await supabase
            .from('roles')
            .select('id, name')
            .order('name');
        if (rolesErr) {
            console.error('Fetch roles error:', rolesErr);
        } else {
            console.log('Roles size:', roles.length);
        }

    } catch (e) {
        console.error('Exception:', e);
    }
}

test();
