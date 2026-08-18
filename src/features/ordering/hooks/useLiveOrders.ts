import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Order, OrderItem, RestaurantTable } from '../lib/types';

import { fetchKitchenOrdersData } from '../actions/waiterActions';

export type LiveOrder = Order & {
    restaurant_tables: RestaurantTable | null;
    order_items: (OrderItem & { status?: string; menu_items: { name: string; is_veg?: boolean; category_id?: string } | null })[];
    order_status_history?: { status: string; changed_at: string }[];
};

export function useLiveOrders(allowedStatuses: string[], options?: { ascending?: boolean }) {
    const [orders, setOrders] = useState<LiveOrder[]>([]);
    const [loading, setLoading] = useState(true);

    // Memoize dependency
    const statusKey = allowedStatuses.join(',');
    const ascending = options?.ascending ?? false;

    const fetchOrders = useCallback(async () => {
        const allowed = statusKey.split(',');
        const res = await fetchKitchenOrdersData();
        if (res.success && res.orders) {
            const filtered = res.orders.filter((o: any) => allowed.includes(o.status));
            setOrders(filtered as unknown as LiveOrder[]);
        } else {
            // Fallback to browser client
            const { data } = await supabase
                .from('orders')
                .select(`
              *,
              restaurant_tables (*),
              order_items (
                *,
                menu_items (name, is_veg, category_id)
              ),
              order_status_history (
                status,
                changed_at
              )
            `)
                .in('status', allowed)
                .order('created_at', { ascending });
            if (data) setOrders(data as unknown as LiveOrder[]);
        }
        setLoading(false);
    }, [statusKey, ascending]);

    useEffect(() => {
        // Initial fetch
        fetchOrders();

        // 10-second background fallback interval (WebSockets handle instant 0ms updates)
        const pollInterval = setInterval(() => {
            fetchOrders();
        }, 10000);

        // Realtime WebSockets listener
        const channel = supabase
            .channel(`live-orders-${Math.random().toString(36).substring(2, 9)}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'orders' },
                () => {
                    fetchOrders();
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'order_items' },
                () => {
                    fetchOrders();
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'order_status_history' },
                () => {
                    fetchOrders();
                }
            )
            .subscribe();

        return () => {
            clearInterval(pollInterval);
            supabase.removeChannel(channel);
        };
    }, [fetchOrders]);

    return { orders, setOrders, loading, refetch: fetchOrders };
}
