"use server";

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Table Management ────────────────────────────────────────────────────────

export async function createTable(waiterName?: string) {
    const { data: maxRow } = await admin
        .from('restaurant_tables')
        .select('table_no')
        .order('table_no', { ascending: false })
        .limit(1)
        .single();

    const nextNo = (maxRow?.table_no ?? 0) + 1;

    // Resolve waiter_id if name provided
    let waiterId: string | null = null;
    if (waiterName) {
        const { data: waiter } = await admin
            .from('staff_users')
            .select('id')
            .ilike('name', waiterName)
            .limit(1)
            .single();
        waiterId = waiter?.id ?? null;
    }

    const { error } = await admin.from('restaurant_tables').insert({
        table_no: nextNo,
        assigned_waiter_id: waiterId,
        qr_code_url: null,
    });

    if (error) return { success: false, error: error.message };
    revalidatePath('/staff/admin');
    return { success: true, table_no: nextNo };
}

export async function deleteTable(tableId: string) {
    const { error } = await admin.from('restaurant_tables').delete().eq('id', tableId);
    if (error) return { success: false, error: error.message };
    revalidatePath('/staff/admin');
    return { success: true };
}

export async function updateTableWaiter(tableId: string, waiterId: string | null) {
    const { error } = await admin
        .from('restaurant_tables')
        .update({ assigned_waiter_id: waiterId })
        .eq('id', tableId);
    if (error) return { success: false, error: error.message };
    revalidatePath('/staff/admin');
    return { success: true };
}

// ─── Menu ───────────────────────────────────────────────────────────────────

export async function deleteAllMenuItems() {
    // Manually cascade deletes to prevent FK constraint violations
    await admin.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await admin.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    const { error } = await admin
        .from('menu_items')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) return { success: false, error: error.message };
    revalidatePath('/staff/admin');
    return { success: true };
}

export async function updateMenuItem(id: string, name: string, price: number, category: string) {
    // Find or create category
    let { data: cat } = await admin.from('categories').select('id').ilike('name', category).single();
    if (!cat) {
        const { data: newCat } = await admin.from('categories').insert({ name: category }).select('id').single();
        cat = newCat;
    }
    const { error } = await admin.from('menu_items')
        .update({ name, price, category_id: cat?.id })
        .eq('id', id);
    if (error) return { success: false, error: error.message };
    revalidatePath('/staff/admin');
    return { success: true };
}

export async function updateMenuItemAvailability(id: string, is_available: boolean) {
    const { error } = await admin.from('menu_items')
        .update({ is_available })
        .eq('id', id);
    if (error) return { success: false, error: error.message };
    revalidatePath('/staff/admin');
    return { success: true };
}

export async function deleteMenuItem(id: string) {
    // Manually cascade delete order_items referencing this item
    await admin.from('order_items').delete().eq('menu_item_id', id);

    const { error } = await admin.from('menu_items').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    revalidatePath('/staff/admin');
    return { success: true };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function addMenuItem(name: string, price: number, category: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cat: any = (await admin.from('categories').select('id, sort_order').ilike('name', category).single()).data;
    if (!cat) {
        const { data: maxSort } = await admin.from('categories').select('sort_order').order('sort_order', { ascending: false }).limit(1).single();
        const nextOrder = (maxSort?.sort_order ?? 0) + 1;
        cat = (await admin.from('categories').insert({ name: category, sort_order: nextOrder }).select('id, sort_order').single()).data;
    }
    const { error } = await admin.from('menu_items').insert({
        name,
        price,
        category_id: cat?.id,
        is_available: true
    });
    if (error) return { success: false, error: error.message };
    revalidatePath('/staff/admin');
    return { success: true };
}

export async function bulkAddMenuItems(items: { name: string, price: number, category: string }[]) {
    // 1. Fetch existing categories
    const { data: existingCats } = await admin.from('categories').select('id, name');
    const catMap = new Map((existingCats || []).map(c => [c.name.toLowerCase(), c.id]));

    // 2. Identify missing categories
    const uniqueIncomingCats = [...new Set(items.map(i => i.category))];
    const missingCats = uniqueIncomingCats.filter(c => !catMap.has(c.toLowerCase()));

    // 3. Create missing categories
    if (missingCats.length > 0) {
        const { data: maxSort } = await admin.from('categories').select('sort_order').order('sort_order', { ascending: false }).limit(1).single();
        let nextOrder = (maxSort?.sort_order ?? 0) + 1;

        const newCatPayloads = missingCats.map(name => ({ name, sort_order: nextOrder++ }));
        const { data: insertedCats } = await admin.from('categories').insert(newCatPayloads).select('id, name');

        (insertedCats || []).forEach(c => catMap.set(c.name.toLowerCase(), c.id));
    }

    // 4. Insert menu items
    const menuPayloads = items.map(i => ({
        name: i.name,
        price: i.price,
        category_id: catMap.get(i.category.toLowerCase()),
        is_available: true
    }));

    const { error } = await admin.from('menu_items').insert(menuPayloads);
    if (error) return { success: false, error: error.message };

    revalidatePath('/staff/admin');
    return { success: true };
}

// ─── Activity Log ────────────────────────────────────────────────────────────

export async function fetchActivityLog() {
    const { data, error } = await admin
        .from('staff_activity_log')
        .select('*, staff_users(name, roles(name))')
        .order('login_at', { ascending: false })
        .limit(50);

    if (error) return { success: false, error: error.message, data: [] };
    return { success: true, data: data ?? [] };
}

export async function logStaffLogin(staffId: string) {
    await admin.from('staff_activity_log').insert({ staff_id: staffId, login_at: new Date().toISOString() });
}

export async function logStaffLogout(staffId: string) {
    // Update the most recent open session (no logout_at yet)
    const { data: session } = await admin
        .from('staff_activity_log')
        .select('id')
        .eq('staff_id', staffId)
        .is('logout_at', null)
        .order('login_at', { ascending: false })
        .limit(1)
        .single();

    if (session) {
        await admin
            .from('staff_activity_log')
            .update({ logout_at: new Date().toISOString() })
            .eq('id', session.id);
    }
}
