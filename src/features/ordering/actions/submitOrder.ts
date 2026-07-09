"use server";

import { supabaseAdmin } from '../lib/supabaseAdmin';
import { CustomerSession, CartItem } from '../store/useCartStore';

export async function submitCustomerOrder(customer: CustomerSession, cart: CartItem[]) {
    if (!customer.name || !customer.phone || customer.table_no <= 0) {
        throw new Error('Invalid customer session details');
    }

    if (!cart || cart.length === 0) {
        throw new Error('Cart is completely empty');
    }

    try {
        // 1. Fetch table UUID by mapping table_no (if dynamic QR mapping is required)
        // For now, we will create/find the restaurant_tables row based on the manual number to ensure integrity.

        const { data: tables } = await supabaseAdmin
            .from('restaurant_tables')
            .select('id')
            .eq('table_no', customer.table_no);

        let tableId: string;

        if (!tables || tables.length === 0) {
            // Auto-register table if it doesn't physically exist in settings mapping yet (soft-insert fallback)
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

        // 2. Insert the Order block ('pending' by default based on schema)
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

        // 3. Atomically map and insert all Order Items pulling snapshot prices directly from the cart layout state
        const orderItemsPayload = cart.map(item => ({
            order_id: order.id,
            menu_item_id: item.menu_item_id,
            qty: item.qty,
            notes: item.notes || null,
            price_at_order: item.price
        }));

        const { error: itemsErr } = await supabaseAdmin
            .from('order_items')
            .insert(orderItemsPayload);

        if (itemsErr) throw new Error(`Order Items mapping failed: ${itemsErr.message}`);

        // 4. Update the order_status_history audit log explicitly declaring creation
        await supabaseAdmin
            .from('order_status_history')
            .insert([{
                order_id: order.id,
                status: 'pending',
                changed_by: null // customer autonomously spawned this action
            }]);

        // Return the successful UUID to bind back to the client Zustand session
        return { success: true, orderId: order.id };

    } catch (error) {
        const errObj = error as Error;
        console.error("Order submission failure:", errObj.message);
        return { success: false, error: errObj.message };
    }
}
