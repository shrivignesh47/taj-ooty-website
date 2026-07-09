"use server";

import { createSupabaseServerClient } from '../lib/supabaseServer';
import { supabaseAdmin } from '../lib/supabaseAdmin';

export async function advanceOrderStatus(orderId: string, newStatus: string) {
    // 1. Authenticate Request
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Unauthorized. Staff session required to mutate order status.' };
    }

    // 2. Fetch staff member ID to log the audit history correctly
    const { data: staff, error: authErr } = await supabaseAdmin
        .from('staff_users')
        .select('id, role_id')
        .eq('auth_id', user.id)
        .single();

    if (authErr || !staff) {
        return { error: 'Staff profile mapping failed' };
    }

    // 3. Atomically update the order and log history
    const { error: updateErr } = await supabaseAdmin
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

    if (updateErr) {
        return { error: `Order transition failed: ${updateErr.message}` };
    }

    const { error: auditErr } = await supabaseAdmin
        .from('order_status_history')
        .insert([{
            order_id: orderId,
            status: newStatus,
            changed_by: staff.id
        }]);

    if (auditErr) {
        console.error("Failed to log order history", auditErr);
    }

    return { success: true };
}
