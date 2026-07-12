"use server";

import { supabaseAdmin } from '../lib/supabaseAdmin';
import { CustomerSession, CartItem } from '../store/useCartStore';
import { revalidatePath } from 'next/cache';

export async function submitCustomerOrder(customer: CustomerSession, cart: CartItem[]) {
    if (!customer.name || !customer.phone || customer.table_no <= 0) {
        throw new Error('Invalid customer session details');
    }

    if (!cart || cart.length === 0) {
        throw new Error('Cart is completely empty');
    }

    try {
        // 1. Fetch table UUID by mapping table_no
        const { data: tables } = await supabaseAdmin
            .from('restaurant_tables')
            .select('id')
            .eq('table_no', customer.table_no);

        let tableId: string;

        if (!tables || tables.length === 0) {
            const { data: newTable, error: tableErr } = await supabaseAdmin
                .from('restaurant_tables')
                .insert([{ table_no: customer.table_no }])
                .select()
                .single();

            if (tableErr) throw new Error(`Table registration failed: ${tableErr.message}`);
            tableId = newTable.id;
        } else {
            tableId = tables[0].id;
        }

        // 2. Check if there is already an unconfirmed ('pending') order on this table.
        // If previous orders on this table are already 'confirmed', 'preparing', 'ready', or 'served',
        // we create a brand new 'pending' order (KOT ticket) so the waiter gets alerted in Incoming Orders,
        // can review/edit the new items, and send a separate clean KOT to the kitchen!
        const { data: activeOrders } = await supabaseAdmin
            .from('orders')
            .select('id, status')
            .eq('table_id', tableId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        let orderId: string;

        if (activeOrders && activeOrders.length > 0) {
            // Append items to existing active order!
            const activeOrder = activeOrders[0];
            orderId = activeOrder.id;

            const orderItemsPayload = cart.map(item => ({
                order_id: orderId,
                menu_item_id: item.menu_item_id,
                qty: item.qty,
                notes: item.notes || null,
                price_at_order: item.price,
                status: 'pending'
            }));

            const { error: itemsErr } = await supabaseAdmin
                .from('order_items')
                .insert(orderItemsPayload);

            if (itemsErr) throw new Error(`Order Items mapping failed: ${itemsErr.message}`);

            // If existing order was served or ready, transition back to preparing so kitchen knows immediately!
            if (['served', 'ready'].includes(activeOrder.status)) {
                await supabaseAdmin.from('orders').update({ status: 'preparing' }).eq('id', orderId);
                await supabaseAdmin.from('order_status_history').insert([{
                    order_id: orderId,
                    status: 'preparing',
                    changed_by: null
                }]);
            } else {
                await supabaseAdmin.from('orders').update({ updated_at: new Date().toISOString() }).eq('id', orderId);
            }
        } else {
            // Create brand new order
            const { data: order, error: orderErr } = await supabaseAdmin
                .from('orders')
                .insert([{
                    table_id: tableId,
                    customer_name: customer.name,
                    customer_phone: customer.phone,
                    status: 'pending'
                }])
                .select()
                .single();

            if (orderErr) throw new Error(`Order insertion failed: ${orderErr.message}`);
            orderId = order.id;

            const orderItemsPayload = cart.map(item => ({
                order_id: orderId,
                menu_item_id: item.menu_item_id,
                qty: item.qty,
                notes: item.notes || null,
                price_at_order: item.price,
                status: 'pending'
            }));

            const { error: itemsErr } = await supabaseAdmin
                .from('order_items')
                .insert(orderItemsPayload);

            if (itemsErr) throw new Error(`Order Items mapping failed: ${itemsErr.message}`);

            await supabaseAdmin
                .from('order_status_history')
                .insert([{
                    order_id: orderId,
                    status: 'pending',
                    changed_by: null
                }]);
        }

        revalidatePath('/staff/kitchen');
        revalidatePath('/staff/orders');
        revalidatePath('/staff/dashboard');
        revalidatePath('/staff/admin');

        return { success: true, orderId };

    } catch (error) {
        const errObj = error as Error;
        console.error("Order submission failure:", errObj.message);
        return { success: false, error: errObj.message };
    }
}
