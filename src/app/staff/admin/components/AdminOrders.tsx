/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useLiveOrders } from '@/features/ordering/hooks/useLiveOrders';
import { ClipboardList } from 'lucide-react';

const ALL_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'served'];

const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    confirmed: 'bg-blue-100 text-blue-800',
    preparing: 'bg-orange-100 text-orange-800',
    ready: 'bg-green-100 text-green-800',
    served: 'bg-[#4E1414]/10 text-[#4E1414]',
    billed: 'bg-gray-100 text-gray-600',
};

function timeSince(dateStr: string) {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
}

export function AdminOrders() {
    const { orders, loading } = useLiveOrders(ALL_STATUSES);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 text-[#4E1414]">
                <div className="animate-pulse text-center">
                    <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="font-semibold text-sm">Loading orders…</p>
                </div>
            </div>
        );
    }

    if (orders.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-[#4E1414]/60">
                <ClipboardList className="w-14 h-14 mb-4 opacity-30" />
                <p className="text-xl font-bold">No orders yet today</p>
                <p className="text-sm mt-1 text-[#241B15]/50">Orders placed by customers will appear here in real time.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Summary strip */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {ALL_STATUSES.map(s => {
                    const count = orders.filter(o => o.status === s).length;
                    return (
                        <div key={s} className="bg-white rounded-xl border border-[#C9974A]/20 px-4 py-3 text-center">
                            <div className="text-2xl font-black text-[#4E1414]">{count}</div>
                            <div className="text-xs font-bold uppercase tracking-wider text-[#241B15]/50 capitalize">{s}</div>
                        </div>
                    );
                })}
            </div>

            {/* Orders table */}
            <div className="bg-white rounded-2xl border border-[#C9974A]/20 shadow-sm overflow-hidden">
                <div className="overflow-x-auto taj-scrollbar">
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="bg-[#4E1414] text-[#F6EEDF]">
                                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Table</th>
                                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Items</th>
                                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Total</th>
                                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Placed</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F6EEDF]">
                            {orders.map((order: any) => {
                                const total = order.order_items?.reduce(
                                    (s: number, i: any) => s + i.price_at_order * i.qty, 0
                                ) ?? 0;
                                const itemSummary = order.order_items
                                    ?.map((i: any) => `${i.menu_items?.name ?? '?'} ×${i.qty}`)
                                    .join(', ') ?? '—';

                                return (
                                    <tr key={order.id} className="hover:bg-[#F6EEDF]/40 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-[#241B15]">{order.customer_name}</div>
                                            <div className="text-xs text-[#241B15]/50">{order.customer_phone}</div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-[#4E1414]">
                                            T-{order.restaurant_tables?.table_no ?? '?'}
                                        </td>
                                        <td className="px-6 py-4 text-[#241B15]/80 max-w-[240px] truncate">
                                            {itemSummary}
                                        </td>
                                        <td className="px-6 py-4 font-black text-[#C9974A]">
                                            ₹{total.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-[#241B15]/50">
                                            {timeSince(order.created_at)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
