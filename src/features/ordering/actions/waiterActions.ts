"use server";

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const adminEdge = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function acceptOrder(orderId: string, waiterId: string, customTableNo?: number) {
    try {
        const payload: any = { waiter_id: waiterId };

        // If they provided a custom table via prompt
        if (customTableNo) {
            // First UPSERT the table to make sure it exists, or just use table_no
            // It's tricky because orders reference table_id, not table_no. 
            // We need to look up or insert the table.
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

        const { error } = await adminEdge.from('orders').update(payload).eq('id', orderId);
        if (error) throw error;

        revalidatePath('/staff/orders');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function pushToKitchen(orderId: string) {
    try {
        const { error } = await adminEdge.from('orders').update({ status: 'confirmed' }).eq('id', orderId);
        if (error) throw error;
        revalidatePath('/staff/orders');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
