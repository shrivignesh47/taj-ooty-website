/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { verifyStaff } from './auth';

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
    const auth = await verifyStaff();
    const { error } = await admin
        .from('restaurant_tables')
        .update({ assigned_waiter_id: waiterId })
        .eq('id', tableId);
    if (error) return { success: false, error: error.message };

    await logAuditActivity(auth.success ? (auth.user?.id ?? null) : null, 'TABLE_WAITER_ASSIGNED', {
        table_id: tableId,
        waiter_id: waiterId || 'unassigned'
    });

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

export async function logAuditActivity(staffId: string | null, action: string, details?: any) {
    try {
        await admin.from('staff_activity_log').insert({
            staff_id: staffId,
            action,
            details: details ?? {}
        });
    } catch (err) {
        console.error('Audit log insert failed:', err);
    }
}

export async function fetchActivityLog() {
    const { data, error } = await admin
        .from('staff_activity_log')
        .select('*, staff_users(name, roles(name))')
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) return { success: false, error: error.message, data: [] };
    return { success: true, data: data ?? [] };
}

export async function logStaffLogin(staffId: string) {
    await logAuditActivity(staffId, 'LOGIN', { method: 'password' });
}

export async function logStaffLogout(staffId: string) {
    await logAuditActivity(staffId, 'LOGOUT', { trigger: 'user_action' });
}

// ─── Restaurant Settings ─────────────────────────────────────────────────────

export async function fetchRestaurantSettings() {
    const auth = await verifyStaff();
    if (!auth.success) {
        return { success: false, error: 'Unauthorized' };
    }

    const { data, error } = await admin
        .from('restaurant_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true, data };
}

export async function saveRestaurantSettings(payload: {
    restaurant_name: string;
    gst_number: string;
    fssai_number: string;
    service_charge_percent: number;
    phone: string;
    email: string;
    address: string;
    auto_print_on_accept: boolean;
    printer_name: string;
    print_kot: boolean;
    print_bill: boolean;
    station_routing_enabled?: boolean;
}) {
    const auth = await verifyStaff();
    if (!auth.success || !auth.user) {
        return { success: false, error: 'Unauthorized' };
    }

    const canManageSettings =
        auth.user.roleName?.toLowerCase() === 'admin' ||
        auth.user.permissions.includes('manage_staff');

    if (!canManageSettings) {
        return { success: false, error: 'You do not have permission to update settings.' };
    }

    const { data: existing, error: readError } = await admin
        .from('restaurant_settings')
        .select('id')
        .limit(1)
        .maybeSingle();

    if (readError) {
        return { success: false, error: readError.message };
    }

    const query = existing
        ? admin.from('restaurant_settings').update(payload).eq('id', existing.id)
        : admin.from('restaurant_settings').insert(payload);

    const { error } = await query;

    if (error) {
        return { success: false, error: error.message };
    }

    await logAuditActivity(auth.user.id, 'SETTINGS_UPDATED', payload);

    revalidatePath('/staff/admin');
    return { success: true };
}

export async function fetchStationMappings() {
    const auth = await verifyStaff();
    if (!auth.success) return { success: false, error: 'Unauthorized' };

    const [stationsRes, categoriesRes, mappingsRes, settingsRes] = await Promise.all([
        admin.from('kitchen_stations').select('*').order('sort_order', { ascending: true }),
        admin.from('categories').select('*').order('sort_order', { ascending: true }),
        admin.from('station_category_map').select('*'),
        admin.from('restaurant_settings').select('station_routing_enabled').limit(1).maybeSingle()
    ]);

    return {
        success: true,
        stations: stationsRes.data ?? [],
        categories: categoriesRes.data ?? [],
        map: mappingsRes.data ?? [],
        station_routing_enabled: settingsRes.data?.station_routing_enabled || false
    };
}

export async function saveStationMappings(stationRoutingEnabled: boolean, mappings: { station_id: string, category_id: string }[]) {
    const auth = await verifyStaff();
    if (!auth.success || !auth.user) return { success: false, error: 'Unauthorized' };

    // 1. Update restaurant_settings
    const { data: existing } = await admin.from('restaurant_settings').select('id').limit(1).maybeSingle();
    if (existing) {
        await admin.from('restaurant_settings').update({ station_routing_enabled: stationRoutingEnabled }).eq('id', existing.id);
    } else {
        await admin.from('restaurant_settings').insert({ station_routing_enabled: stationRoutingEnabled });
    }

    // 2. Replace all mappings
    await admin.from('station_category_map').delete().neq('station_id', '00000000-0000-0000-0000-000000000000');
    if (mappings.length > 0) {
        const { error: mapErr } = await admin.from('station_category_map').insert(mappings);
        if (mapErr) return { success: false, error: mapErr.message };
    }

    await logAuditActivity(auth.user.id, 'STATION_ROUTING_UPDATED', { enabled: stationRoutingEnabled, mappingsCount: mappings.length });

    revalidatePath('/staff/admin');
    revalidatePath('/staff/kitchen');
    return { success: true };
}

export async function saveKdsConfig(kdsConfig: Record<string, unknown>) {
    const auth = await verifyStaff();
    if (!auth.success || !auth.user) {
        return { success: false, error: 'Unauthorized' };
    }

    const { data: existing, error: readError } = await admin
        .from('restaurant_settings')
        .select('id')
        .limit(1)
        .maybeSingle();

    if (readError) {
        return { success: false, error: readError.message };
    }

    if (!existing) {
        const { error } = await admin.from('restaurant_settings').insert({
            kds_config: kdsConfig,
        });
        if (error) return { success: false, error: error.message };
    } else {
        const { error } = await admin
            .from('restaurant_settings')
            .update({ kds_config: kdsConfig })
            .eq('id', existing.id);
        if (error) return { success: false, error: error.message };
    }

    revalidatePath('/staff/kitchen');
    return { success: true };
}

export async function deleteAllOrders() {
    try {
        const auth = await verifyStaff();
        if (!auth.success || !auth.user) {
            return { success: false, error: 'Unauthorized Session' };
        }

        // Delete bills first due to FK constraints
        await admin.from('bills').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        
        // Delete all orders (will cascade delete order_items and order_status_history)
        const { error } = await admin.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (error) {
            return { success: false, error: error.message };
        }
        
        revalidatePath('/staff/admin');
        return { success: true };
    } catch (e: unknown) {
        return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
    }
}

export async function deleteOrder(orderId: string) {
    try {
        const auth = await verifyStaff();
        if (!auth.success || !auth.user) {
            return { success: false, error: 'Unauthorized Session' };
        }

        // Delete bill linked to this order first due to FK constraints
        await admin.from('bills').delete().eq('order_id', orderId);
        
        // Delete the order itself (will cascade delete order_items and order_status_history)
        const { error } = await admin.from('orders').delete().eq('id', orderId);
        
        if (error) {
            return { success: false, error: error.message };
        }
        
        revalidatePath('/staff/admin');
        return { success: true };
    } catch (e: unknown) {
        return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
    }
}
