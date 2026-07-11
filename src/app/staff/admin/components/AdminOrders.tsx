/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { advanceOrderStatus } from '@/features/ordering/actions/updateOrderStatus';
import { deleteAllOrders, deleteOrder } from '@/features/ordering/actions/adminActions';

interface Props {
    orders: any[];
    onRefresh?: () => Promise<void> | void;
}

const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    confirmed: 'bg-orange-50 text-orange-700 border-orange-200',
    preparing: 'bg-blue-50 text-blue-700 border-blue-200',
    ready: 'bg-purple-50 text-purple-700 border-purple-200',
    served: 'bg-green-50 text-green-700 border-green-200',
    billed: 'bg-gray-100 text-gray-700 border-gray-300',
    cancelled: 'bg-red-50 text-red-700 border-red-200'
};

export function AdminOrders({ orders, onRefresh }: Props) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [expanded, setExpanded] = useState<string | null>(null);
    const [deletingAll, setDeletingAll] = useState(false);

    const handleDeleteAll = async () => {
        if (!confirm("Are you absolutely sure you want to delete ALL orders and bills? This action is permanent and cannot be undone.")) return;
        if (!confirm("Double check: Confirm complete deletion of all records?")) return;

        setDeletingAll(true);
        const res = await deleteAllOrders();
        setDeletingAll(false);

        if (res.success) {
            if (onRefresh) await onRefresh();
            alert("All orders deleted successfully.");
        } else {
            alert("Failed to delete orders: " + res.error);
        }
    };

    const handleDeleteOrder = async (orderId: string) => {
        if (!confirm("Are you sure you want to delete this order? This action is permanent and cannot be undone.")) return;

        const res = await deleteOrder(orderId);
        if (res.success) {
            if (onRefresh) await onRefresh();
            alert("Order deleted successfully.");
        } else {
            alert("Failed to delete order: " + res.error);
        }
    };

    const filtered = orders.filter(o => {
        const matchStatus = statusFilter === 'all' || o.status === statusFilter;
        const matchSearch = String(o.id).toLowerCase().includes(search.toLowerCase()) ||
            o.table_id?.toLowerCase().includes(search.toLowerCase()) ||
            o.customer_name?.toLowerCase().includes(search.toLowerCase());
        return matchStatus && matchSearch;
    });

    const handleOverrideStatus = async (orderId: string, newStatus: string) => {
        if (!confirm(`Force override status to ${newStatus}?`)) return;

        const res = await advanceOrderStatus(orderId, newStatus);
        if (res && 'error' in res && res.error) {
            alert('Failed to override status: ' + res.error);
            return;
        }

        if (onRefresh) {
            await onRefresh();
        }
        alert('Order status overridden.');
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex gap-3 items-center w-full md:w-auto">
                    <div className="flex bg-white border border-[#C9974A]/30 rounded-xl overflow-hidden shadow-sm flex-1 md:flex-none">
                        <div className="pl-3 py-2 flex items-center justify-center text-[#C9974A]">
                            <Search className="w-5 h-5" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search IDs, tables, customers..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="px-3 py-2 outline-none text-[#241B15] w-full md:w-64 text-sm font-medium"
                        />
                    </div>
                    {orders.length > 0 && (
                        <button 
                            onClick={handleDeleteAll} 
                            disabled={deletingAll}
                            className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95 duration-100 disabled:opacity-50"
                        >
                            <Trash2 className="w-4 h-4" /> Delete All
                        </button>
                    )}
                </div>

                <div className="flex gap-2 bg-[#F6EEDF] p-1 rounded-xl border border-[#C9974A]/30 overflow-x-auto taj-scrollbar">
                    {['all', 'pending', 'confirmed', 'preparing', 'ready', 'served', 'billed'].map(st => (
                        <button
                            key={st}
                            onClick={() => setStatusFilter(st)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${statusFilter === st ? 'bg-[#4E1414] text-white shadow' : 'text-[#4E1414] hover:bg-[#e4d7be]'}`}
                        >
                            {st}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#C9974A]/20 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#F6EEDF]/50 text-[#4E1414] font-black uppercase text-[11px] tracking-wider border-b border-[#C9974A]/20">
                            <tr>
                                <th className="px-6 py-4">Time</th>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Table</th>
                                <th className="px-6 py-4">Summary</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#C9974A]/10">
                            {filtered.map(o => {
                                const isExp = expanded === o.id;
                                const total = o.order_items?.reduce((acc: number, cur: any) => acc + (cur.price_at_order * cur.qty), 0) || 0;
                                const summary = o.order_items?.map((i: any) => `${i.qty}x`).join(', ');

                                return (
                                    <React.Fragment key={o.id}>
                                        <tr
                                            onClick={() => setExpanded(isExp ? null : o.id)}
                                            className="hover:bg-[#F6EEDF]/30 transition-colors cursor-pointer"
                                        >
                                            <td className="px-6 py-4 text-[#241B15]/70 font-medium whitespace-nowrap">
                                                {format(new Date(o.created_at), 'MMM d, h:mm a')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-[#241B15]">{o.customer_name}</div>
                                                <div className="text-xs text-[#241B15]/50">{o.customer_phone}</div>
                                            </td>
                                            <td className="px-6 py-4 font-black text-[#4E1414]">
                                                {o.restaurant_tables?.table_no ? `T-${o.restaurant_tables?.table_no}` : 'Takeaway'}
                                            </td>
                                            <td className="px-6 py-4 text-[#241B15]/70 text-xs truncate max-w-[200px]">
                                                {o.order_items?.length} items ({summary}...)
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-md text-xs font-bold border capitalize ${STATUS_COLORS[o.status] || STATUS_COLORS.pending}`}>
                                                    {o.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-[#C9974A]">
                                                ₹{total.toFixed(2)}
                                                <div className="inline-block ml-2 text-[#4E1414] opacity-50">
                                                    {isExp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                </div>
                                            </td>
                                        </tr>
                                        {isExp && (
                                            <tr className="bg-[#4E1414]/5">
                                                <td colSpan={6} className="px-6 py-6 border-b border-[#C9974A]/20">
                                                    <div className="flex gap-8 justify-between">
                                                        <div className="flex-1">
                                                            <h5 className="text-xs font-black text-[#4E1414] uppercase tracking-wider mb-3">Itemized Bill</h5>
                                                            <div className="space-y-2">
                                                                {o.order_items?.map((item: any, idx: number) => (
                                                                    <div key={idx} className="flex justify-between text-sm text-[#241B15]">
                                                                        <span>{item.qty} × Unit Price ₹{item.price_at_order}</span>
                                                                        <span className="font-bold text-[#C9974A]">₹{(item.price_at_order * item.qty).toFixed(2)}</span>
                                                                    </div>
                                                                ))}
                                                                <div className="pt-2 mt-2 border-t border-[#C9974A]/20 flex justify-between font-black">
                                                                    <span>Grand Total</span>
                                                                    <span className="text-lg">₹{total.toFixed(2)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="w-64">
                                                            <h5 className="text-xs font-black text-[#4E1414] uppercase tracking-wider mb-3">Admin Actions</h5>
                                                            <p className="text-[10px] text-[#241B15]/50 mb-3 font-semibold uppercase tracking-wide">Force Override Status</p>
                                                            <select
                                                                onChange={(e) => handleOverrideStatus(o.id, e.target.value)}
                                                                value={o.status}
                                                                className="w-full bg-white border border-[#C9974A]/40 rounded-xl px-3 py-2 text-sm font-bold text-[#4E1414] outline-none p-2 mb-2"
                                                            >
                                                                <option value="pending">Pending</option>
                                                                <option value="confirmed">Confirmed</option>
                                                                <option value="preparing">Preparing</option>
                                                                <option value="ready">Ready</option>
                                                                <option value="served">Served</option>
                                                                <option value="billed">Billed</option>
                                                                <option value="cancelled">Cancelled</option>
                                                            </select>
                                                            <button 
                                                                onClick={() => handleDeleteOrder(o.id)}
                                                                className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 duration-100 mt-3"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" /> Delete Order
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
