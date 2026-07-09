const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    const { data: rolesRes, error } = await supabaseAdmin.from('roles').select('*, role_permissions(permissions(id, key))').order('name');
    console.log(JSON.stringify(rolesRes, null, 2));
    console.log(error);
}

test();
