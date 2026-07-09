import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Order, OrderItem, RestaurantTable } from '../lib/types';

export type LiveOrder = Order & {
    restaurant_tables: RestaurantTable;
    order_items: (OrderItem & { menu_items: { name: string } })[];
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
          )
        `)
                .in('status', allowed)
                .order('created_at', { ascending: false });

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
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [statusKey]);

    return { orders, loading };
}
