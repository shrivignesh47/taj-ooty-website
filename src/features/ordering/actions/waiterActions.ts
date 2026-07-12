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

        // Sync waiter to physical table so Admin table view shows exact assigned waiter
        const { data: ord } = await adminEdge.from('orders').select('table_id').eq('id', orderId).single();
        const targetTableId = payload.table_id || ord?.table_id;
        if (targetTableId && waiterId) {
            await adminEdge.from('restaurant_tables').update({ assigned_waiter_id: waiterId }).eq('id', targetTableId);
        }

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

        await adminEdge.from('staff_activity_log').insert({
            staff_id: waiterId,
            action: 'ORDER_CONFIRMED',
            details: { order_id: orderId, table_id: targetTableId }
        });

        revalidatePath('/staff/orders');
        revalidatePath('/staff/kitchen');
        revalidatePath('/staff/dashboard');
        revalidatePath('/staff/admin');
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
        revalidatePath('/staff/kitchen');
        revalidatePath('/staff/dashboard');
        revalidatePath('/staff/admin');
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
        revalidatePath('/staff/kitchen');
        revalidatePath('/staff/dashboard');
        revalidatePath('/staff/admin');
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
        revalidatePath('/staff/kitchen');
        revalidatePath('/staff/dashboard');
        revalidatePath('/staff/admin');
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
    if (isNaN(tableNo) || tableNo <= 0) return { success: false, error: 'Invalid table number' };
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

        // Check if there is already an active order for this table
        const { data: activeOrders } = await adminEdge
            .from('orders')
            .select('id, status')
            .eq('table_id', tableId)
            .in('status', ['pending', 'confirmed', 'preparing', 'ready', 'served'])
            .order('created_at', { ascending: false });

        let orderId: string;

        if (activeOrders && activeOrders.length > 0) {
            // Append items to the existing active order!
            const activeOrder = activeOrders[0];
            orderId = activeOrder.id;

            const orderItemsPayload = items.map(item => ({
                order_id: orderId,
                menu_item_id: item.menu_item_id,
                qty: item.qty,
                notes: item.notes || null,
                price_at_order: item.price,
                status: 'pending'
            }));
            await adminEdge.from('order_items').insert(orderItemsPayload);

            // If existing order was served or ready, transition back to preparing so kitchen knows!
            if (['served', 'ready'].includes(activeOrder.status)) {
                await adminEdge.from('orders').update({ status: 'preparing' }).eq('id', orderId);
                await adminEdge.from('order_status_history').insert({
                    order_id: orderId,
                    status: 'preparing',
                    changed_by: waiterId
                });
            } else {
                await adminEdge.from('orders').update({ updated_at: new Date().toISOString() }).eq('id', orderId);
            }
        } else {
            // Create brand new order
            const { data: order, error: orderErr } = await adminEdge.from('orders').insert([{
                table_id: tableId,
                customer_name: customerName || `Table ${tableNo} Guest`,
                customer_phone: customerPhone || '0000000000',
                status: 'confirmed',
                waiter_id: waiterId
            }]).select().single();

            if (orderErr) throw orderErr;
            orderId = order.id;

            const orderItemsPayload = items.map(item => ({
                order_id: orderId,
                menu_item_id: item.menu_item_id,
                qty: item.qty,
                notes: item.notes || null,
                price_at_order: item.price,
                status: 'pending'
            }));
            await adminEdge.from('order_items').insert(orderItemsPayload);

            await adminEdge.from('order_status_history').insert([
                { order_id: orderId, status: 'pending', changed_by: waiterId },
                { order_id: orderId, status: 'confirmed', changed_by: waiterId }
            ]);
        }

        revalidatePath('/staff/orders');
        revalidatePath('/staff/kitchen');
        revalidatePath('/staff/dashboard');
        revalidatePath('/staff/admin');
        return { success: true, orderId };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function addItemsToOrder(
    orderId: string,
    waiterId: string,
    items: { menu_item_id: string, qty: number, price_at_order: number, notes?: string }[]
) {
    if (!items || items.length === 0) return { success: false, error: 'No items to add' };
    try {
        const { data: order } = await adminEdge.from('orders').select('id, status').eq('id', orderId).single();
        if (!order) return { success: false, error: 'Order not found' };

        const orderItemsPayload = items.map(item => ({
            order_id: orderId,
            menu_item_id: item.menu_item_id,
            qty: item.qty,
            notes: item.notes || null,
            price_at_order: item.price_at_order,
            status: 'pending'
        }));
        await adminEdge.from('order_items').insert(orderItemsPayload);

        // If order was ready or served, transition back to preparing so kitchen sees the new items immediately
        if (['served', 'ready'].includes(order.status)) {
            await adminEdge.from('orders').update({ status: 'preparing' }).eq('id', orderId);
            await adminEdge.from('order_status_history').insert({
                order_id: orderId,
                status: 'preparing',
                changed_by: waiterId
            });
        } else {
            await adminEdge.from('orders').update({ updated_at: new Date().toISOString() }).eq('id', orderId);
        }

        revalidatePath('/staff/orders');
        revalidatePath('/staff/kitchen');
        revalidatePath('/staff/dashboard');
        revalidatePath('/staff/admin');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateOrderItemQty(orderItemId: string, newQty: number) {
    try {
        if (newQty <= 0) {
            await adminEdge.from('order_items').delete().eq('id', orderItemId);
        } else {
            await adminEdge.from('order_items').update({ qty: newQty }).eq('id', orderItemId);
        }
        revalidatePath('/staff/orders');
        revalidatePath('/staff/kitchen');
        revalidatePath('/staff/dashboard');
        revalidatePath('/staff/admin');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteOrderItem(orderItemId: string) {
    try {
        await adminEdge.from('order_items').delete().eq('id', orderItemId);
        revalidatePath('/staff/orders');
        revalidatePath('/staff/kitchen');
        revalidatePath('/staff/dashboard');
        revalidatePath('/staff/admin');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function getOrCreateTableAndCheckOccupied(tableNo: number) {
    try {
        if (isNaN(tableNo) || tableNo <= 0) return { success: false, error: 'Invalid table number' };

        // 1. Find if table exists
        const { data: tables, error: tableErr } = await adminEdge
            .from('restaurant_tables')
            .select('id, table_no')
            .eq('table_no', tableNo);

        if (tableErr) throw tableErr;

        let tableId: string;
        let isNew = false;

        if (!tables || tables.length === 0) {
            // Table doesn't exist, create it!
            const { data: newTable, error: createErr } = await adminEdge
                .from('restaurant_tables')
                .insert({ table_no: tableNo })
                .select('id, table_no')
                .single();

            if (createErr) throw createErr;
            tableId = newTable.id;
            isNew = true;
        } else {
            tableId = tables[0].id;
        }

        // 2. If it's not a newly created table, check if it has active orders
        if (!isNew) {
            const { data: activeOrders, error: ordersErr } = await adminEdge
                .from('orders')
                .select('id, customer_name, customer_phone')
                .eq('table_id', tableId)
                .in('status', ['pending', 'confirmed', 'preparing', 'ready', 'served']);

            if (ordersErr) throw ordersErr;

            if (activeOrders && activeOrders.length > 0) {
                // Instead of blocking with "Table already occupied", return success along with existing order details so customer/waiter can join & append!
                return { 
                    success: true, 
                    tableNo,
                    tableId,
                    hasActiveOrder: true,
                    activeOrderId: activeOrders[0].id,
                    customerName: activeOrders[0].customer_name,
                    customerPhone: activeOrders[0].customer_phone
                };
            }
        }

        return { success: true, tableNo, tableId, hasActiveOrder: false };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
