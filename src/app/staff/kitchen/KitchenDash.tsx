"use client";

import { useLiveOrders, LiveOrder } from '@/features/ordering/hooks/useLiveOrders';
import { advanceOrderStatus } from '@/features/ordering/actions/updateOrderStatus';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, CheckCircle, ChefHat, Loader2, ArrowRight } from 'lucide-react';
import { useState } from 'react';

export function KitchenDash() {
    // Kitchen only cares about 'confirmed' (new KOTs) and 'preparing'
    const { orders, loading } = useLiveOrders(['confirmed', 'preparing']);

    if (loading) {
        return <div className="text-[#C9974A] font-bold animate-pulse">Syncing KOTs...</div>;
    }

    const confirmed = orders.filter(o => o.status === 'confirmed');
    const preparing = orders.filter(o => o.status === 'preparing');

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
            <OrderColumn
                title="Confirmed Tickets (Queue)"
                orders={confirmed}
                nextAction="preparing"
                actionIcon={<Flame className="w-4 h-4" />}
                actionText="Start Prep"
                theme="default"
            />
            <OrderColumn
                title="Actively Preparing"
                orders={preparing}
                nextAction="ready"
                actionIcon={<CheckCircle className="w-4 h-4" />}
                actionText="Mark as Ready"
                theme="active"
            />
        </div>
    );
}

function OrderColumn({ title, orders, nextAction, actionIcon, actionText, theme }: { title: string, orders: LiveOrder[], nextAction?: string, actionIcon?: React.ReactNode, actionText?: string, theme?: string }) {
    const isDark = theme === 'active';

    return (
        <div className={`rounded-2xl shadow-xl p-6 flex flex-col min-h-[60vh] border ${isDark ? 'bg-[#350C0C] border-[#C9974A]/30' : 'bg-[#F6EEDF] border-transparent'}`}>
            <h2 className={`text-xl font-display font-bold mb-6 pb-4 border-b flex justify-between items-center ${isDark ? 'text-[#F6EEDF] border-[#C9974A]/20' : 'text-[#350C0C] border-[#350C0C]/10'}`}>
                <span className="flex items-center gap-2">
                    {isDark && <ChefHat className="text-[#C9974A] w-5 h-5" />}
                    {title}
                </span>
                <span className={`${isDark ? 'bg-[#C9974A] text-[#241B15]' : 'bg-[#4E1414] text-[#F6EEDF]'} px-3 py-1 rounded-full text-xs font-bold`}>
                    {orders.length}
                </span>
            </h2>

            <div className="flex flex-col gap-4 overflow-y-auto flex-grow pr-2">
                <AnimatePresence>
                    {orders.map((order: LiveOrder) => (
                        <OrderCard
                            key={order.id}
                            order={order}
                            nextAction={nextAction}
                            actionIcon={actionIcon}
                            actionText={actionText}
                            darkTheme={isDark}
                        />
                    ))}
                    {orders.length === 0 && (
                        <div className="text-center italic opacity-50 py-10 text-white/50">No tickets matching this sequence.</div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

function OrderCard({ order, nextAction, actionIcon, actionText, darkTheme }: { order: LiveOrder, nextAction?: string, actionIcon?: React.ReactNode, actionText?: string, darkTheme?: boolean }) {
    const [submitting, setSubmitting] = useState(false);

    const handleAdvance = async () => {
        if (!nextAction) return;
        setSubmitting(true);
        await advanceOrderStatus(order.id, nextAction);
        setSubmitting(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`border-l-4 p-5 rounded-xl shadow-md ${darkTheme ? 'bg-[#241B15] border-[#C9974A]' : 'bg-white border-[#4E1414]'}`}
        >
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className={`font-bold text-2xl leading-none ${darkTheme ? 'text-[#F6EEDF]' : 'text-[#241B15]'}`}>
                        Table {order.restaurant_tables?.table_no || '?'}
                    </h3>
                    <span className="text-xs font-semibold opacity-60 text-current mt-1 block">Ticket #{order.id.slice(0, 6).toUpperCase()}</span>
                </div>
            </div>

            <ul className="text-base space-y-2 mb-6">
                {order.order_items?.map((item, idx: number) => (
                    <li key={idx} className={`font-bold flex items-start gap-3 ${darkTheme ? 'text-[#C9974A]' : 'text-[#4E1414]'}`}>
                        <span className="bg-current text-white px-2 py-0.5 rounded text-xs mt-0.5">{item.qty}x</span>
                        <span className={darkTheme ? 'text-[#F6EEDF]' : 'text-[#241B15]'}>{item.menu_items?.name}</span>
                    </li>
                ))}
            </ul>

            {nextAction && (
                <button
                    onClick={handleAdvance}
                    disabled={submitting}
                    className={`w-full font-bold py-3.5 rounded-lg flex justify-center items-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-50 ${darkTheme ? 'bg-[#C9974A] hover:bg-white text-[#241B15]' : 'bg-[#4E1414] hover:bg-[#350C0C] text-[#F6EEDF]'}`}
                >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : actionIcon}
                    {actionText} <ArrowRight className="w-4 h-4 ml-1 opacity-50" />
                </button>
            )}
        </motion.div>
    );
}
