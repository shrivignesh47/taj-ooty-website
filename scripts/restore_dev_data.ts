import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import ws from 'ws';

(global as any).WebSocket = ws;

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
    console.log("Restoring Development Data...");
    
    const adminEmail = 'admin@taj.com';
    const waiterEmail = 'shrivigneshsumathi@gmail.com';
    const password = 'password123';

    // 1. Roles
    const { data: adminRole } = await supabase.from('roles').select('id').eq('name', 'admin').single();
    const { data: waiterRole } = await supabase.from('roles').select('id').eq('name', 'waiter').single();

    if (!adminRole || !waiterRole) {
        console.error("Roles missing! Did supabase/seed.sql not run?");
        return;
    }

    // 2. Admin Account
    let adminAuthId;
    const { data: existingAdminList } = await supabase.auth.admin.listUsers();
    let adminAuth = existingAdminList.users.find(u => u.email === adminEmail);
    if (!adminAuth) {
        const { data: newAdmin } = await supabase.auth.admin.createUser({ email: adminEmail, password, email_confirm: true });
        adminAuthId = newAdmin?.user?.id;
    } else {
        adminAuthId = adminAuth.id;
        await supabase.auth.admin.updateUserById(adminAuthId, { password, email_confirm: true });
    }
    
    const { data: adminStaff } = await supabase.from('staff_users').select('id').eq('auth_id', adminAuthId).single();
    if (!adminStaff) {
        await supabase.from('staff_users').insert({ auth_id: adminAuthId, role_id: adminRole.id, name: 'Admin User', is_active: true });
    }

    // 3. Waiter Account
    let waiterAuthId;
    let waiterAuth = existingAdminList.users.find(u => u.email === waiterEmail);
    if (!waiterAuth) {
        const { data: newWaiter } = await supabase.auth.admin.createUser({ email: waiterEmail, password, email_confirm: true });
        waiterAuthId = newWaiter?.user?.id;
    } else {
        waiterAuthId = waiterAuth.id;
        await supabase.auth.admin.updateUserById(waiterAuthId, { password, email_confirm: true });
    }

    const { data: waiterStaff } = await supabase.from('staff_users').select('id').eq('auth_id', waiterAuthId).single();
    if (!waiterStaff) {
        await supabase.from('staff_users').insert({ auth_id: waiterAuthId, role_id: waiterRole.id, name: 'Shri Vignesh', is_active: true });
    }
    
    // 4. Tables
    const { data: existingTables } = await supabase.from('restaurant_tables').select('id').limit(1);
    if (existingTables && existingTables.length === 0) {
        await supabase.from('restaurant_tables').insert([
            { table_no: 1 },
            { table_no: 9 }
        ]);
    }

    // 5. Menu Items
    const { data: existingCat } = await supabase.from('categories').select('id').limit(1);
    if (existingCat && existingCat.length === 0) {
        const { data: cat } = await supabase.from('categories').insert({ name: 'Soups', sort_order: 1 }).select('id').single();
        if (cat) {
            await supabase.from('menu_items').insert([
                { category_id: cat.id, name: 'Cream of Mushroom', price: 145, is_available: true },
                { category_id: cat.id, name: 'Cream of Tomato', price: 145, is_available: true }
            ]);
        }
    }

    console.log("Database restored successfully!");
}

run().catch(console.error);
