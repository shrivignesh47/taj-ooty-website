"use server";

import { supabaseAdmin } from '../lib/supabaseAdmin';
import { supabase } from '../lib/supabase';
import { CustomerSession, CartItem } from '../store/useCartStore';
import { revalidatePath } from 'next/cache';

export async function submitCustomerOrder(customer: CustomerSession, cart: CartItem[], idempotencyKey: string) {
    // 1. Strict Validation
    if (!idempotencyKey) return { success: false, error: 'Missing session key' };
    if (!customer.name || customer.name.length < 2 || customer.name.length > 50) {
        return { success: false, error: 'Name must be between 2 and 50 characters' };
    }
    
    if (!customer.phone || !/^\d{10}$/.test(customer.phone)) {
        return { success: false, error: 'Phone number must be exactly 10 digits' };
    }

    if (!customer.table_no || customer.table_no <= 0) {
        return { success: false, error: 'Invalid table number' };
    }

    if (!cart || cart.length === 0) {
        return { success: false, error: 'Cart is completely empty' };
    }

    for (const item of cart) {
        if (!item.menu_item_id) return { success: false, error: 'Invalid item in cart' };
        if (item.qty <= 0 || !Number.isInteger(item.qty)) return { success: false, error: 'Invalid quantity' };
        if (item.qty > 50) return { success: false, error: 'Quantity for item exceeds maximum limit of 50' };
    }

    try {
        // 1.5 Idempotency Check
        const { data: existingOrder } = await supabaseAdmin
            .from('orders')
            .select('id, status')
            .eq('idempotency_key', idempotencyKey)
            .maybeSingle();

        if (existingOrder) {
            return { success: true, orderId: existingOrder.id, alreadySubmitted: true };
        }

        // 2. Validate Table (must exist)
        const { data: tables } = await supabaseAdmin
            .from('restaurant_tables')
            .select('id')
            .eq('table_no', customer.table_no);

        if (!tables || tables.length === 0) {
            return { success: false, error: 'Invalid table. Please scan the QR code again or ask staff for help.' };
        }
        
        const tableId = tables[0].id;

        // 3. Rate limiting (max 5 orders in 10 mins)
        const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        const { count: recentOrdersCount } = await supabaseAdmin
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('customer_phone', customer.phone)
            .gte('created_at', tenMinsAgo);

        if (recentOrdersCount !== null && recentOrdersCount >= 5) {
            return { success: false, error: "You've placed several orders recently. Please wait a few minutes or contact your waiter." };
        }

        // 4. Validate menu items (must exist & be available)
        const itemIds = cart.map(i => i.menu_item_id);
        const { data: menuItems } = await supabaseAdmin
            .from('menu_items')
            .select('id, is_available')
            .in('id', itemIds);

        if (!menuItems || menuItems.length !== itemIds.length) {
            return { success: false, error: 'One or more items in your cart are invalid or no longer exist.' };
        }

        for (const dbItem of menuItems) {
            if (!dbItem.is_available) {
                return { success: false, error: 'One or more items in your cart are currently out of stock.' };
            }
        }

        // 5. Check if there is already an unconfirmed ('pending') order on this table.
        const { data: activeOrders } = await supabaseAdmin
            .from('orders')
            .select('id, status')
            .eq('table_id', tableId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        let orderId: string;

        // Helper: build payload and insert order items using ANON client
        const insertOrderItems = async (targetOrderId: string) => {
            const orderItemsPayload = cart.map(item => ({
                order_id: targetOrderId,
                menu_item_id: item.menu_item_id,
                qty: item.qty,
                notes: item.notes || null,
                price_at_order: item.price,
                status: 'pending'
            }));

            const { error: itemsErr } = await supabase
                .from('order_items')
                .insert(orderItemsPayload);

            if (itemsErr) {
                if (itemsErr.message?.includes('STOCK_EXHAUSTED:')) {
                    const userMsg = itemsErr.message
                        .split('STOCK_EXHAUSTED:')[1]
                        ?.split('\n')[0]
                        ?.trim()
                        ?? 'Sorry, one or more items just sold out. Please remove them and try again.';
                    throw new Error(userMsg);
                }
                throw new Error(`Order Items mapping failed: ${itemsErr.message}`);
            }
        };

        if (activeOrders && activeOrders.length > 0) {
            // Append items to existing pending order
            const activeOrder = activeOrders[0];
            orderId = activeOrder.id;

            await insertOrderItems(orderId);
            
            await supabaseAdmin.from('orders').update({ updated_at: new Date().toISOString() }).eq('id', orderId);
        } else {
            // Create brand new order using ANON client (relies on RLS)
            const { data: order, error: orderErr } = await supabase
                .from('orders')
                .insert([{
                    table_id: tableId,
                    customer_name: customer.name,
                    customer_phone: customer.phone,
                    status: 'pending',
                    idempotency_key: idempotencyKey
                }])
                .select()
                .single();

            if (orderErr) {
                // Check if race condition triggered unique constraint on idempotency_key (23505)
                if (orderErr.code === '23505') {
                    const { data: duplicate } = await supabaseAdmin
                        .from('orders')
                        .select('id')
                        .eq('idempotency_key', idempotencyKey)
                        .maybeSingle();
                    if (duplicate) return { success: true, orderId: duplicate.id, alreadySubmitted: true };
                }
                throw new Error(`Order insertion failed: ${orderErr.message}`);
            }
            orderId = order.id;

            try {
                await insertOrderItems(orderId);
            } catch (err) {
                // Roll back: delete the orphaned order since items failed
                await supabaseAdmin.from('orders').delete().eq('id', orderId);
                const errMsg = err instanceof Error ? err.message : 'Could not place order. Please try again.';
                return { success: false, error: errMsg };
            }

            const { error: historyErr } = await supabase
                .from('order_status_history')
                .insert([{
                    order_id: orderId,
                    status: 'pending',
                    changed_by: null
                }]);
            
            if (historyErr) {
                console.error("Order history insert failed:", historyErr);
            }
        }

        revalidatePath('/staff/kitchen');
        revalidatePath('/staff/orders');
        revalidatePath('/staff/dashboard');
        revalidatePath('/staff/admin');

        return { success: true, orderId };

    } catch (error) {
        const errObj = error as Error;
        return { success: false, error: errObj.message };
    }
}
