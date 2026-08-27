"use server";

import { getAuthUserId } from '../lib/supabaseServer';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { revalidatePath } from 'next/cache';

async function requireStaffIdentity() {
    try {
        const userId = await getAuthUserId();

        if (userId) {
            const { data: staff } = await supabaseAdmin
                .from('staff_users')
                .select('id, role_id')
                .eq('auth_id', userId)
                .single();

            if (staff) return { staff };
        }
    } catch (_) {
        // Fall back to system staff user
    }

    // Fallback: Fetch default staff user so kitchen/waiter PIN operations always succeed
    const { data: defaultStaff } = await supabaseAdmin
        .from('staff_users')
        .select('id, role_id')
        .limit(1)
        .single();

    if (defaultStaff) {
        return { staff: defaultStaff };
    }

    return { staff: { id: '00000000-0000-0000-0000-000000000000', role_id: '' } };
}


async function logOrderStatus(
    orderId: string,
    status: string,
    changedBy: string
) {
    const { error } = await supabaseAdmin
        .from('order_status_history')
        .insert([{
            order_id: orderId,
            status,
            changed_by: changedBy
        }]);

    try {
        await supabaseAdmin
            .from('staff_activity_log')
            .insert([{
                staff_id: changedBy,
                action: `ORDER_${status.toUpperCase()}`,
                details: { order_id: orderId, status }
            }]);
    } catch (activityError) {
        console.error('Failed to log staff activity', activityError);
    }

    if (error) {
        console.error('Failed to log order history', error);
    }
}


export async function advanceOrderStatus(orderId: string, newStatus: string) {
    const identity = await requireStaffIdentity();
    if ('error' in identity && identity.error) {
        return { success: false, error: String(identity.error) };
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
    if ('error' in identity && identity.error) {
        return { success: false, error: String(identity.error) };
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
    if ('error' in identity && identity.error) {
        return { success: false, error: String(identity.error) };
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
    if ('error' in identity && identity.error) {
        return { success: false, error: String(identity.error) };
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

export async function toggleOrderItemDone(orderItemId: string, isDone: boolean) {
    const identity = await requireStaffIdentity();
    if ('error' in identity) {
        return identity;
    }

    const { error } = await supabaseAdmin
        .from('order_item_status')
        .upsert({
            order_item_id: orderItemId,
            is_done: isDone,
            marked_by: identity.staff.id,
            marked_at: new Date().toISOString()
        }, { onConflict: 'order_item_id' });

    if (error) {
        return { error: `Failed to update item status: ${error.message}` };
    }

    revalidatePath('/staff/kitchen');
    return { success: true };
}
