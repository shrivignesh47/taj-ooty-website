import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Order, OrderItem, RestaurantTable } from '../lib/types';

export type LiveOrder = Order & {
    restaurant_tables: RestaurantTable | null;
    order_items: (OrderItem & { status?: string; menu_items: { name: string } | null })[];
    order_status_history?: { status: string; changed_at: string }[];
};

export function useLiveOrders(allowedStatuses: string[]) {
    const [orders, setOrders] = useState<LiveOrder[]>([]);
    const [loading, setLoading] = useState(true);

    // Memoize dependency
    const statusKey = allowedStatuses.join(',');

    useEffect(() => {
        const fetchOrders = async () => {
            const allowed = statusKey.split(',');
            const { data, error } = await supabase
                .from('orders')
                .select(`
          *,
          restaurant_tables (*),
          order_items (
            *,
            menu_items (name)
          ),
          order_status_history (
            status,
            changed_at
          )
        `)
                .in('status', allowed)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Failed to fetch live orders', error);
            }

            if (!error && data) {
                setOrders(data as unknown as LiveOrder[]);
            }
            setLoading(false);
        };

        fetchOrders();

        const channel = supabase
            .channel('live-orders')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'orders' },
                () => fetchOrders()
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'order_items' },
                () => fetchOrders()
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'order_status_history' },
                () => fetchOrders()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [statusKey]);

    return { orders, loading };
}
