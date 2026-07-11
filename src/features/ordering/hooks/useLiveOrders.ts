import { useState, useEffect, useCallback } from 'react';
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

    const fetchOrders = useCallback(async () => {
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
    }, [statusKey]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchOrders();

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
            supabase.removeChannel(channel);
        };
    }, [fetchOrders]);

    return { orders, loading, refetch: fetchOrders };
}
