"use server";

import { createSupabaseServerClient } from '../lib/supabaseServer';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { revalidatePath } from 'next/cache';

async function requireStaffIdentity() {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Unauthorized. Staff session required to mutate order status.' };
    }

    const { data: staff, error: authErr } = await supabaseAdmin
        .from('staff_users')
        .select('id, role_id')
        .eq('auth_id', user.id)
        .single();

    if (authErr || !staff) {
        return { error: 'Staff profile mapping failed' };
    }

    return { staff };
}

async function logOrderStatus(orderId: string, status: string, changedBy: string) {
    const { error } = await supabaseAdmin
        .from('order_status_history')
        .insert([{
            order_id: orderId,
            status,
            changed_by: changedBy
        }]);

    if (error) {
        console.error('Failed to log order history', error);
    }
}

export async function advanceOrderStatus(orderId: string, newStatus: string) {
    const identity = await requireStaffIdentity();
    if ('error' in identity) {
        return identity;
    }

    const { error: updateErr } = await supabaseAdmin
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

    if (updateErr) {
        return { error: `Order transition failed: ${updateErr.message}` };
    }

    await logOrderStatus(orderId, newStatus, identity.staff.id);

    revalidatePath('/staff/kitchen');
    revalidatePath('/staff/orders');
    revalidatePath('/staff/dashboard');
    return { success: true };
}

export async function updateKitchenItemStatus(
    orderId: string,
    orderItemId: string,
    nextStatus: 'pending' | 'ready'
) {
    const identity = await requireStaffIdentity();
    if ('error' in identity) {
        return identity;
    }

    const { error } = await supabaseAdmin
        .from('order_items')
        .update({ status: nextStatus })
        .eq('id', orderItemId)
        .eq('order_id', orderId);

    if (error) {
        return { error: `Failed to update item status: ${error.message}` };
    }

    revalidatePath('/staff/kitchen');
    revalidatePath('/staff/orders');
    revalidatePath('/staff/dashboard');
    return { success: true };
}

export async function startKitchenOrder(orderId: string) {
    const identity = await requireStaffIdentity();
    if ('error' in identity) {
        return identity;
    }

    const { error } = await supabaseAdmin
        .from('orders')
        .update({ status: 'preparing' })
        .eq('id', orderId);

    if (error) {
        return { error: `Failed to start preparation: ${error.message}` };
    }

    const { error: itemsError } = await supabaseAdmin
        .from('order_items')
        .update({ status: 'pending' })
        .eq('order_id', orderId)
        .is('status', null);

    if (itemsError) {
        console.error('Failed to normalize order item statuses', itemsError);
    }

    await logOrderStatus(orderId, 'preparing', identity.staff.id);
    revalidatePath('/staff/kitchen');
    revalidatePath('/staff/orders');
    revalidatePath('/staff/dashboard');
    return { success: true };
}

export async function markKitchenOrderReady(orderId: string) {
    const identity = await requireStaffIdentity();
    if ('error' in identity) {
        return identity;
    }

    const { error: itemsError } = await supabaseAdmin
        .from('order_items')
        .update({ status: 'ready' })
        .eq('order_id', orderId)
        .neq('status', 'cancelled');

    if (itemsError) {
        return { error: `Failed to update KOT items: ${itemsError.message}` };
    }

    const { error: orderError } = await supabaseAdmin
        .from('orders')
        .update({ status: 'ready' })
        .eq('id', orderId);

    if (orderError) {
        return { error: `Failed to mark order ready: ${orderError.message}` };
    }

    await logOrderStatus(orderId, 'ready', identity.staff.id);
    revalidatePath('/staff/kitchen');
    revalidatePath('/staff/orders');
    revalidatePath('/staff/dashboard');
    return { success: true };
}
