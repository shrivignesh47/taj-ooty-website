/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/features/ordering/lib/supabase';
import { Loader2, Calendar } from 'lucide-react';

export function OrderHistory({ activeUser }: { activeUser: any }) {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            const start = new Date(dateFilter);
            start.setHours(0, 0, 0, 0);
            const end = new Date(dateFilter);
            end.setHours(23, 59, 59, 999);

            const { data } = await supabase
                .from('orders')
                .select(`
                    id, created_at, status, customer_name,
                    restaurant_tables(table_no),
                    order_items(qty, price_at_order, menu_items(name))
                `)
                .eq('waiter_id', activeUser.id)
                .in('status', ['billed', 'cancelled', 'served'])
                .gte('created_at', start.toISOString())
                .lte('created_at', end.toISOString())
                .order('created_at', { ascending: false });

            setHistory(data || []);
            setLoading(false);
        };

        fetchHistory();
    }, [dateFilter, activeUser.id]);

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-[#C9974A]/20 p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="font-display font-bold text-[#350C0C] text-lg">Order History</h2>
                <div className="relative">
                    <Calendar className="w-4 h-4 text-[#241B15]/50 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input 
                        type="date" 
                        value={dateFilter} 
                        onChange={e => setDateFilter(e.target.value)}
                        className="pl-8 pr-3 py-1.5 bg-[#F6EEDF] border border-[#C9974A]/20 rounded-lg text-sm font-bold text-[#4E1414] focus:outline-none focus:ring-2 focus:ring-[#C9974A]"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-10 text-[#C9974A]">
                    <Loader2 className="w-6 h-6 animate-spin" />
                </div>
            ) : history.length === 0 ? (
                <div className="text-center opacity-50 py-10">
                    <p className="font-bold">No history found.</p>
                    <p className="text-xs">No completed orders for this date.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {history.map(order => (
                        <HistoryCard key={order.id} order={order} />
                    ))}
                </div>
            )}
        </div>
    );
}

function HistoryCard({ order }: { order: any }) {
    const [expanded, setExpanded] = useState(false);
    
    const isCancelled = order.status === 'cancelled';
    const total = order.order_items?.reduce((acc: number, i: any) => acc + (i.qty * i.price_at_order), 0) || 0;

    return (
        <div className={`border rounded-xl p-3 ${isCancelled ? 'bg-red-50/50 border-red-100' : 'bg-[#F6EEDF]/30 border-[#C9974A]/20'}`}>
            <div 
                className="flex justify-between items-center cursor-pointer" 
                onClick={() => setExpanded(!expanded)}
            >
                <div>
                    <h4 className="font-bold text-[#4E1414] leading-tight">Table {order.restaurant_tables?.table_no || '?'}</h4>
                    <span className="text-[10px] font-bold uppercase text-[#241B15]/60">
                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {order.customer_name}
                    </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isCancelled ? 'bg-red-100 text-red-600' : 
                        order.status === 'billed' ? 'bg-green-100 text-green-700' :
                        'bg-gray-200 text-gray-600'
                    }`}>
                        {order.status}
                    </span>
                    <span className="text-xs font-black text-[#241B15]">₹{total}</span>
                </div>
            </div>

            {expanded && (
                <ul className="mt-3 pt-3 border-t border-[#241B15]/10 text-xs space-y-1">
                    {order.order_items?.map((item: any, idx: number) => (
                        <li key={idx} className="flex justify-between">
                            <span className="text-[#241B15]"><b className="mr-1.5 text-[#4E1414]">{item.qty}x</b>{item.menu_items?.name}</span>
                            <span className="font-bold text-[#C9974A]">₹{item.price_at_order * item.qty}</span>
                        </li>
                    ))}
                    {order.order_items?.length === 0 && <li className="text-[#241B15]/50 italic">No items</li>}
                </ul>
            )}
        </div>
    );
}
