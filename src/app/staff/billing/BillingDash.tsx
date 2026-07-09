"use client";

import { useLiveOrders, LiveOrder } from '@/features/ordering/hooks/useLiveOrders';
import { advanceOrderStatus } from '@/features/ordering/actions/updateOrderStatus';
import { motion, AnimatePresence } from 'framer-motion';
import { IndianRupee, Loader2, Utensils, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

export function BillingDash() {
    // Cashiers care about 'ready' (food waiting to be picked up) and 'served' (tables currently eating/awaiting bill)
    const { orders, loading } = useLiveOrders(['ready', 'served']);

    if (loading) {
        return <div className="text-[#C9974A] font-bold animate-pulse">Syncing Billing Pipelines...</div>;
    }

    const ready = orders.filter(o => o.status === 'ready');
    const served = orders.filter(o => o.status === 'served');

    return (
        <div className="space-y-12">
            <BillingSection
                title="Ready for Pickup (Food at Kitchen Window)"
                orders={ready}
                nextAction="served"
                actionText="Mark as Served (Table is Eating)"
                icon={<Utensils className="w-5 h-5 text-[#C9974A]" />}
            />

            <BillingSection
                title="Active Tables (Eating / Awaiting Bill)"
                orders={served}
                nextAction="billed"
                actionText="Finalize Payment & Close Bill"
                icon={<IndianRupee className="w-5 h-5 text-[#4E1414]" />}
                isFinal
            />
        </div>
    );
}

function BillingSection({ title, orders, nextAction, actionText, icon, isFinal }: { title: string, orders: LiveOrder[], nextAction?: string, actionText?: string, icon?: React.ReactNode, isFinal?: boolean }) {
    return (
        <section>
            <h2 className="text-xl font-display font-bold text-[#350C0C] mb-4 flex items-center gap-3">
                {icon} {title}
                <span className="bg-[#241B15] text-[#F6EEDF] px-2.5 py-0.5 rounded-full text-xs font-bold ml-2">
                    {orders.length}
                </span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence>
                    {orders.map((order: LiveOrder) => (
                        <CheckoutCard
                            key={order.id}
                            order={order}
                            nextAction={nextAction}
                            actionText={actionText}
                            isFinal={isFinal}
                        />
                    ))}
                    {orders.length === 0 && (
                        <div className="col-span-full border border-dashed border-[#C9974A]/40 rounded-xl p-8 text-center text-[#241B15]/50 font-medium italic">
                            No tables currently in this pipeline.
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </section>
    );
}

function CheckoutCard({ order, nextAction, actionText, isFinal }: { order: LiveOrder, nextAction?: string, actionText?: string, isFinal?: boolean }) {
    const [submitting, setSubmitting] = useState(false);

    const totalBill = order.order_items?.reduce((sum: number, item) => sum + (item.price_at_order * item.qty), 0) || 0;

    const handleAdvance = async () => {
        if (!nextAction) return;
        setSubmitting(true);
        await advanceOrderStatus(order.id, nextAction);
        // Note: For a true billing app, this would INSERT into bills table. 
        // Here we just advance the schema pipeline to 'billed' closing the loop natively.
        setSubmitting(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className={`border rounded-xl p-5 shadow-sm bg-white ${isFinal ? 'border-[#4E1414]' : 'border-[#C9974A]/40'}`}
        >
            <div className="flex justify-between items-start mb-4 pb-4 border-b border-[#C9974A]/20">
                <div>
                    <h3 className="font-bold text-xl text-[#241B15] leading-none mb-1">
                        Table {order.restaurant_tables?.table_no || '?'}
                    </h3>
                    <span className="text-xs font-semibold opacity-60 block">{order.customer_name} • {order.customer_phone}</span>
                </div>

                <div className="text-right">
                    <span className="block text-xs uppercase tracking-widest font-bold text-[#C9974A] mb-1">Total Due</span>
                    <span className="text-2xl font-black text-[#4E1414] leading-none">₹{totalBill}</span>
                </div>
            </div>

            <button
                onClick={handleAdvance}
                disabled={submitting}
                className={`w-full font-bold py-3 rounded-lg flex justify-center items-center gap-2 transition-colors disabled:opacity-50 ${isFinal ? 'bg-[#4E1414] hover:bg-[#350C0C] text-[#F6EEDF]' : 'bg-[#F6EEDF] border border-[#C9974A] hover:bg-[#C9974A]/20 text-[#4E1414]'}`}
            >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {actionText}
            </button>
        </motion.div>
    );
}
