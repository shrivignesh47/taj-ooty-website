"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, ChefHat, BellRing, UtensilsCrossed, PlusCircle } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';

const STATUS_STEPS = [
    { key: 'pending', label: 'Placed', icon: Clock },
    { key: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
    { key: 'preparing', label: 'Preparing', icon: ChefHat },
    { key: 'ready', label: 'Ready', icon: BellRing },
    { key: 'served', label: 'Served', icon: UtensilsCrossed }
];

export function CustomerOrderStatus({ orderId }: { orderId: string }) {
    const [status, setStatus] = useState<string>('pending');
    const [loading, setLoading] = useState(true);
    const clearActiveOrder = useCartStore((state) => state.clearActiveOrder);

    useEffect(() => {
        let isMounted = true;
        const fetchInitial = async () => {
            const { data } = await supabase
                .from('orders')
                .select('status')
                .eq('id', orderId)
                .single();
            if (data && isMounted) setStatus(data.status);
            if (isMounted) setLoading(false);
        };

        fetchInitial();

        // Subscribe to live updates for this specific order
        const channel = supabase
            .channel(`customer_order_${orderId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
                (payload) => {
                    if (payload.new && payload.new.status) {
                        setStatus(payload.new.status);
                    }
                }
            )
            .subscribe();

        // Explicit Realtime cleanup
        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
        };
    }, [orderId]);

    if (loading) {
        return (
            <div className="max-w-[430px] mx-auto min-h-screen bg-[#F6EEDF] flex items-center justify-center relative shadow-2xl">
                <div className="text-center text-[#4E1414] animate-pulse font-semibold">Loading your order...</div>
            </div>
        );
    }

    const currentStepIndex = STATUS_STEPS.findIndex(s => s.key === status);
    const activeIndex = status === 'billed' ? STATUS_STEPS.length : (currentStepIndex >= 0 ? currentStepIndex : 0);

    return (
        <div className="max-w-[430px] mx-auto min-h-screen bg-[#F6EEDF] p-6 relative flex flex-col shadow-2xl">
            {/* Success Header Animation */}
            <div className="text-center mt-8 mb-10">
                <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", damping: 15, stiffness: 200 }}
                    className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30"
                >
                    <CheckCircle2 className="w-10 h-10 text-white" />
                </motion.div>
                <motion.h2 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-2xl font-display font-bold text-[#4E1414] mb-1"
                >
                    Order Placed! 🎉
                </motion.h2>
                <motion.p 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-sm text-[#241B15]/60 font-medium"
                >
                    Order #{orderId.split('-')[0].toUpperCase()}
                </motion.p>
            </div>

            {/* Vertical Timeline */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#C9974A]/20 relative mb-8">
                <div className="absolute left-[39px] top-10 bottom-10 w-[2px] bg-[#C9974A]/20 z-0" />
                
                <div className="space-y-8">
                    {STATUS_STEPS.map((step, index) => {
                        const isCompleted = index < activeIndex;
                        const isCurrent = index === activeIndex;
                        const Icon = step.icon;

                        return (
                            <div key={step.key} className="relative z-10 flex items-center gap-5">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-sm transition-colors duration-500 shrink-0
                                    ${isCompleted ? 'bg-[#C9974A] text-white' : 
                                      isCurrent ? 'bg-[#4E1414] text-[#F6EEDF] animate-pulse' : 
                                      'bg-[#F6EEDF] text-[#241B15]/30'}`}
                                >
                                    <Icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 pt-1">
                                    <h4 className={`font-bold text-base leading-none ${isCurrent ? 'text-[#4E1414]' : isCompleted ? 'text-[#241B15]' : 'text-[#241B15]/40'}`}>
                                        {step.label}
                                    </h4>
                                    {isCurrent && <p className="text-[11px] mt-1 text-[#C9974A] font-semibold uppercase tracking-wider">In Progress</p>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Note to customer */}
            <div className="mt-auto mb-6 p-4 bg-orange-50/80 border border-orange-200/50 rounded-xl">
                <p className="text-xs text-orange-800 text-center font-medium leading-relaxed">
                    Your waiter will confirm your order shortly. To change your order, please ask your waiter.
                </p>
            </div>

            {/* Order More Button */}
            <button 
                onClick={() => clearActiveOrder()}
                className="w-full bg-white text-[#4E1414] font-bold py-3.5 rounded-xl border border-[#4E1414]/20 hover:bg-[#F6EEDF] transition-colors shadow-sm flex items-center justify-center gap-2 mb-4"
            >
                <PlusCircle className="w-5 h-5" />
                Order More (Same Table)
            </button>
        </div>
    );
}
