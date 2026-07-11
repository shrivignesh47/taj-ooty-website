/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const adminEdge = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function acceptAndConfirmOrder(
    orderId: string, 
    waiterId: string, 
    customTableNo: number | undefined,
    items: { id?: string, menu_item_id: string, qty: number, notes?: string, price: number }[]
) {
    try {
        const payload: any = { waiter_id: waiterId, status: 'confirmed' };

        // Handle table resolution
        if (customTableNo) {
            let tableId = null;
            const { data: existingTable } = await adminEdge.from('restaurant_tables').select('id').eq('table_no', customTableNo).single();
            if (existingTable) {
                tableId = existingTable.id;
            } else {
                const { data: newTable } = await adminEdge.from('restaurant_tables').insert({ table_no: customTableNo }).select().single();
                if (newTable) tableId = newTable.id;
            }
            if (tableId) payload.table_id = tableId;
        }

        const { error: orderErr } = await adminEdge.from('orders').update(payload).eq('id', orderId);
        if (orderErr) throw orderErr;

        // Replace items
        await adminEdge.from('order_items').delete().eq('order_id', orderId);
        
        const itemsPayload = items.map(i => ({
            order_id: orderId,
            menu_item_id: i.menu_item_id,
            qty: i.qty,
            notes: i.notes || null,
            price_at_order: i.price,
            status: 'pending' // Kitchen starts preparing
        }));
        await adminEdge.from('order_items').insert(itemsPayload);

        await adminEdge.from('order_status_history').insert({
            order_id: orderId,
            status: 'confirmed',
            changed_by: waiterId
        });

        revalidatePath('/staff/orders');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function cancelOrder(orderId: string, waiterId: string, reason: string) {
    try {
        const { error } = await adminEdge.from('orders').update({ status: 'cancelled' }).eq('id', orderId);
        if (error) throw error;

        // Also cancel all order items so kitchen doesn't see them
        await adminEdge.from('order_items').update({ status: 'cancelled' }).eq('order_id', orderId);

        await adminEdge.from('order_status_history').insert({
            order_id: orderId,
            status: 'cancelled',
            changed_by: waiterId,
            notes: reason
        });

        // Audit log entry
        await adminEdge.from('staff_activity_log').insert({
            staff_id: waiterId,
            action: 'REJECT_ORDER',
            details: { order_id: orderId, reason }
        });
        
        revalidatePath('/staff/orders');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function markOrderServed(orderId: string, waiterId: string) {
    try {
        const { error } = await adminEdge.from('orders').update({ status: 'served' }).eq('id', orderId);
        if (error) throw error;

        await adminEdge.from('order_items').update({ status: 'served' }).eq('order_id', orderId);

        await adminEdge.from('order_status_history').insert({
            order_id: orderId,
            status: 'served',
            changed_by: waiterId
        });

        revalidatePath('/staff/orders');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function sendTableToCashier(tableId: string, waiterId: string) {
    try {
        // Find all served orders for this table that aren't billed yet
        const { data: orders, error: ordersErr } = await adminEdge
            .from('orders')
            .select('id')
            .eq('table_id', tableId)
            .eq('status', 'served');

        if (ordersErr || !orders || orders.length === 0) return { success: false, error: "No served orders to bill." };

        for (const order of orders) {
            // Get subtotal
            const { data: items } = await adminEdge
                .from('order_items')
                .select('qty, price_at_order')
                .eq('order_id', order.id);
            
            const subtotal = (items || []).reduce((acc, item) => acc + (item.qty * Number(item.price_at_order)), 0);

            // Create Bill
            await adminEdge.from('bills').insert({
                order_id: order.id,
                total: subtotal
            });

            // Mark order as billed
            await adminEdge.from('orders').update({ status: 'billed' }).eq('id', order.id);
            
            await adminEdge.from('order_status_history').insert({
                order_id: order.id,
                status: 'billed',
                changed_by: waiterId
            });
        }

        revalidatePath('/staff/orders');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function submitWaiterOrder(
    waiterId: string,
    tableNo: number,
    customerName: string,
    customerPhone: string,
    items: { menu_item_id: string, qty: number, notes?: string, price: number }[]
) {
    if (tableNo <= 0) return { success: false, error: 'Invalid table number' };
    if (!items || items.length === 0) return { success: false, error: 'Cart is empty' };

    try {
        const { data: tables } = await adminEdge.from('restaurant_tables').select('id').eq('table_no', tableNo);
        let tableId: string;
        if (!tables || tables.length === 0) {
            const { data: newTable, error: tableErr } = await adminEdge.from('restaurant_tables').insert([{ table_no: tableNo }]).select().single();
            if (tableErr) throw tableErr;
            tableId = newTable.id;
        } else {
            tableId = tables[0].id;
        }

        const { data: order, error: orderErr } = await adminEdge.from('orders').insert([{
            table_id: tableId,
            customer_name: customerName || `Table ${tableNo} Guest`,
            customer_phone: customerPhone || '0000000000',
            status: 'confirmed',
            waiter_id: waiterId
        }]).select().single();

        if (orderErr) throw orderErr;

        const orderItemsPayload = items.map(item => ({
            order_id: order.id,
            menu_item_id: item.menu_item_id,
            qty: item.qty,
            notes: item.notes || null,
            price_at_order: item.price,
            status: 'pending'
        }));
        await adminEdge.from('order_items').insert(orderItemsPayload);

        await adminEdge.from('order_status_history').insert([
            { order_id: order.id, status: 'pending', changed_by: waiterId },
            { order_id: order.id, status: 'confirmed', changed_by: waiterId }
        ]);

        revalidatePath('/staff/orders');
        return { success: true, orderId: order.id };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
