"use server";;;;;

import { supabaseAdmin } from '../lib/supabaseAdmin';

export async function getOrderStatus(orderId: string, customerPhone: string) {
    if (!orderId || !customerPhone) {
        return { success: false, error: 'Order ID and customer phone are required' };
    }

    const cleanedPhone = customerPhone.replace(/\D/g, '');

    try {
        const { data: order, error } = await supabaseAdmin
            .from('orders')
            .select(`
                id,
                created_at,
                status,
                customer_name,
                customer_phone,
                table_id,
                restaurant_tables (
                    table_no
                ),
                order_items (
                    id,
                    qty,
                    price_at_order,
                    notes,
                    status,
                    menu_items (
                        id,
                        name,
                        image_url,
                        is_veg
                    )
                )
            `)
            .eq('id', orderId)
            .maybeSingle();

        if (error) {
            return { success: false, error: error.message };
        }

        if (!order) {
            return { success: false, error: 'Order not found' };
        }

        // Strict verification: customerPhone must match the order's customer_phone
        const dbPhone = (order.customer_phone || '').replace(/\D/g, '');
        if (dbPhone !== cleanedPhone) {
            return { success: false, error: 'Order not found or phone number mismatch' };
        }

        return { success: true, order };
    } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : 'Failed to fetch order status' };
    }
}
