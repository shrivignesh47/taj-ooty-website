/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState } from 'react';
import { LiveOrder } from '@/features/ordering/hooks/useLiveOrders';
import { markOrderServed, sendTableToCashier } from '@/features/ordering/actions/waiterActions';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, DollarSign, ChefHat, CheckSquare } from 'lucide-react';

export function ActiveOrders({ orders, activeUser, onAddItems, onRefresh }: { orders: LiveOrder[], activeUser: any, onAddItems: (tableNo: number) => void, onRefresh?: () => void }) {
    // Group orders by table
    const tableGroups: Record<string, { table_no: number, orders: LiveOrder[] }> = {};
    
    orders.forEach(o => {
        if (!o.table_id) return;
        if (!tableGroups[o.table_id]) {
            tableGroups[o.table_id] = { table_no: o.restaurant_tables?.table_no || 0, orders: [] };
        }
        tableGroups[o.table_id].orders.push(o);
    });

    const tables = Object.values(tableGroups).sort((a, b) => a.table_no - b.table_no);

    if (tables.length === 0) {
        return (
            <div className="text-center opacity-50 py-10">
                <p className="text-lg font-bold">No active tables.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {tables.map(table => (
                <TableGroup key={table.orders[0].table_id} table={table} activeUser={activeUser} onAddItems={onAddItems} onRefresh={onRefresh} />
            ))}
        </div>
    );
}

function TableGroup({ table, activeUser, onAddItems, onRefresh }: { table: { table_no: number, orders: LiveOrder[] }, activeUser: any, onAddItems: (tableNo: number) => void, onRefresh?: () => void }) {
    const [submitting, setSubmitting] = useState(false);

    // If ALL orders for this table are "served", we show Send to Cashier
    const allServed = table.orders.every(o => o.status === 'served');

    const handleSendToCashier = async () => {
        setSubmitting(true);
        const res = await sendTableToCashier(table.orders[0].table_id!, activeUser.id);
        if (res?.success) {
            if (onRefresh) onRefresh();
        } else {
            alert(res?.error);
        }
        setSubmitting(false);
    };

    const hasAddPerm = activeUser.roleName?.toLowerCase() === 'admin' || activeUser.permissions?.includes('edit_orders') || activeUser.permissions?.includes('manage_tables');

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-[#C9974A]/20 overflow-hidden">
            <div className="bg-[#4E1414] px-4 py-3 flex justify-between items-center text-[#F6EEDF]">
                <h3 className="font-display font-bold text-lg">Table {table.table_no}</h3>
                <div className="flex items-center gap-3">
                    {hasAddPerm && (
                        <button 
                            onClick={() => onAddItems(table.table_no)} 
                            className="bg-[#C9974A] text-[#4E1414] px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 active:scale-95 transition-transform"
                        >
                            + Add Items
                        </button>
                    )}
                    <div className="text-xs font-bold uppercase tracking-wider opacity-80">
                        {table.orders.length} Order{table.orders.length !== 1 ? 's' : ''}
                    </div>
                </div>
            </div>

            <div className="p-4 flex flex-col gap-4">
                {table.orders.map(order => (
                    <ActiveOrderCard key={order.id} order={order} activeUser={activeUser} onRefresh={onRefresh} />
                ))}

                {allServed && (
                    <motion.button
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        onClick={handleSendToCashier}
                        disabled={submitting}
                        className="mt-2 w-full bg-green-600 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 shadow-lg active:scale-95 transition-all disabled:opacity-50"
                    >
                        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <DollarSign className="w-5 h-5" />}
                        Send to Cashier (Bill Table)
                    </motion.button>
                )}
            </div>
        </div>
    );
}

function ActiveOrderCard({ order, activeUser, onRefresh }: { order: LiveOrder, activeUser: any, onRefresh?: () => void }) {
    const [submitting, setSubmitting] = useState(false);

    const items = order.order_items || [];
    const isReady = order.status === 'ready';
    const isServed = order.status === 'served';
    
    // Status counts
    const pendingCount = items.filter((i: any) => i.status === 'pending').length;
    const preparingCount = items.filter((i: any) => i.status === 'preparing').length;
    const readyCount = items.filter((i: any) => i.status === 'ready').length;

    const handleMarkServed = async () => {
        setSubmitting(true);
        const res = await markOrderServed(order.id, activeUser.id);
        if (res.success) {
            if (onRefresh) onRefresh();
        } else {
            alert(res.error);
        }
        setSubmitting(false);
    };

    return (
        <div className="border border-[#241B15]/10 rounded-xl p-3 bg-[#F6EEDF]/30 relative">
            <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-bold uppercase text-[#4E1414]">{order.customer_name}</span>
                <span className="text-[10px] font-bold text-[#241B15]/60 bg-white px-2 py-1 rounded-md shadow-sm border border-[#C9974A]/20">
                    {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>

            <ul className="text-sm space-y-1 mb-3">
                {items.map((item: any, idx: number) => (
                    <li key={idx} className="flex justify-between items-center border-b border-[#241B15]/5 pb-1 last:border-0">
                        <span className="font-medium text-[#241B15]">
                            <b className="mr-1.5 text-[#4E1414]">{item.qty}x</b>{item.menu_items?.name}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            item.status === 'ready' ? 'bg-green-100 text-green-700' :
                            item.status === 'preparing' ? 'bg-orange-100 text-orange-700' :
                            item.status === 'served' ? 'bg-gray-200 text-gray-500' :
                            'bg-gray-100 text-gray-600'
                        }`}>
                            {item.status}
                        </span>
                    </li>
                ))}
            </ul>

            {!isServed && (
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#C9974A]/20">
                    <div className="flex gap-2">
                        {preparingCount > 0 && <span className="text-xs font-bold text-orange-600 flex items-center gap-1"><ChefHat className="w-3 h-3"/> {preparingCount} cooking</span>}
                        {readyCount > 0 && <span className="text-xs font-bold text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> {readyCount} ready</span>}
                    </div>

                    {isReady ? (
                        <button
                            onClick={handleMarkServed}
                            disabled={submitting}
                            className="bg-[#4E1414] text-[#C9974A] text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1 disabled:opacity-50"
                        >
                            {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckSquare className="w-3 h-3" />}
                            Mark Served
                        </button>
                    ) : (
                        <span className="text-xs font-bold text-[#241B15]/40 italic">Waiting on kitchen...</span>
                    )}
                </div>
            )}
            
            {isServed && (
                <div className="mt-2 text-center text-xs font-bold text-green-700 bg-green-50 py-1.5 rounded-lg border border-green-200">
                    ✓ Served to Customer
                </div>
            )}
        </div>
    );
}
