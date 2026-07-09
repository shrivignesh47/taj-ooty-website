/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { createClient } from '@supabase/supabase-js';

// Use service role for admin aggregations to bypass RLS and guarantee fast data delivery
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function fetchAdminDashboardData() {
    try {
        const [tablesRes, ordersRes, staffRes, menuRes] = await Promise.all([
            supabaseAdmin.from('restaurant_tables').select('*').order('table_no'),
            supabaseAdmin.from('orders')
                .select(`
                    *,
                    restaurant_tables (table_no),
                    order_items (qty, price_at_order, menu_item_id)
                `)
                .order('created_at', { ascending: false }),
            supabaseAdmin.from('staff_users').select('*, roles (name)'),
            supabaseAdmin.from('menu_items').select('*, categories(name)').order('name')
        ]);

        return {
            success: true,
            tables: tablesRes.data || [],
            orders: ordersRes.data || [],
            staff: staffRes.data || [],
            menu: menuRes.data || [],
            errors: [tablesRes.error, ordersRes.error, staffRes.error, menuRes.error].filter(Boolean)
        };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
