"use client";

import { useLiveOrders, LiveOrder } from '@/features/ordering/hooks/useLiveOrders';
import { advanceOrderStatus } from '@/features/ordering/actions/updateOrderStatus';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckSquare, Loader2 } from 'lucide-react';
import { useState } from 'react';

export function WaiterDash() {
    // Waiters only care about 'pending' (need to be confirmed) 
    // We also track 'confirmed' to let them see what they actively verified to the kitchen.
    const { orders, loading } = useLiveOrders(['pending', 'confirmed']);

    if (loading) {
        return <div className="text-[#C9974A] font-bold animate-pulse">Syncing PostgREST Subscriptions...</div>;
    }

    const pending = orders.filter(o => o.status === 'pending');
    const confirmed = orders.filter(o => o.status === 'confirmed');

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <OrderColumn title="Needs Confirmation (🚨 New)" orders={pending} nextAction="confirmed" />
            <OrderColumn title="Active/Confirmed (In Kitchen)" orders={confirmed} />
        </div>
    );
}

function OrderColumn({ title, orders, nextAction }: { title: string, orders: LiveOrder[], nextAction?: string }) {
    return (
        <div className="bg-white rounded-2xl shadow-xl border border-[#C9974A]/20 p-6 flex flex-col h-full overflow-hidden">
            <h2 className="text-xl font-display font-bold text-[#350C0C] mb-6 pb-4 border-b border-[#C9974A]/30 flex justify-between items-center">
                {title}
                <span className="bg-[#4E1414] text-[#F6EEDF] px-3 py-1 rounded-full text-xs font-bold">{orders.length}</span>
            </h2>

            <div className="flex flex-col gap-4 overflow-y-auto flex-grow pr-2">
                <AnimatePresence>
                    {orders.map(order => (
                        <OrderCard key={order.id} order={order} nextAction={nextAction} />
                    ))}
                    {orders.length === 0 && (
                        <div className="text-center italic opacity-50 py-10">No active tables in this state.</div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

function OrderCard({ order, nextAction }: { order: LiveOrder, nextAction?: string }) {
    const [submitting, setSubmitting] = useState(false);

    const handleAdvance = async () => {
        if (!nextAction) return;
        setSubmitting(true);
        await advanceOrderStatus(order.id, nextAction);
        setSubmitting(false); // Relies on Postgres hook to vanish the card!
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="bg-[#F6EEDF] border-2 border-[#C9974A]/30 p-4 rounded-xl shadow-sm"
        >
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className="font-bold text-lg text-[#241B15] leading-none">Table {order.restaurant_tables?.table_no || '?'}</h3>
                    <span className="text-xs font-semibold text-[#4E1414]">{order.customer_name}</span>
                </div>
                <div className="text-xs text-[#241B15] flex items-center gap-1 opacity-70">
                    <Clock className="w-3 h-3" />
                    {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>

            <ul className="text-sm space-y-1 mb-4 opacity-80 border-l-[3px] border-[#C9974A] pl-3 py-1">
                {order.order_items?.map((item, idx) => (
                    <li key={idx} className="font-medium text-[#241B15]">
                        <b className="mr-2 text-[#4E1414]">{item.qty}x</b>
                        {item.menu_items?.name}
                    </li>
                ))}
            </ul>

            {nextAction && (
                <button
                    onClick={handleAdvance}
                    disabled={submitting}
                    className="w-full bg-[#C9974A] hover:bg-[#4E1414] hover:text-[#F6EEDF] text-[#241B15] font-bold py-2 rounded-lg flex justify-center items-center gap-2 transition-colors disabled:opacity-50"
                >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
                    Push to Kitchen
                </button>
            )}
        </motion.div>
    );
}
