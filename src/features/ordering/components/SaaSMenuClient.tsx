"use client";

import React, { useState, useEffect } from 'react';
import { MenuCatalog } from '../api/getCatalog';
import { useCartStore } from '../store/useCartStore';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Plus } from 'lucide-react';

export function SaaSMenuClient({ catalog }: { catalog: MenuCatalog }) {
    const customer = useCartStore((state) => state.customer);
    const setCustomer = useCartStore((state) => state.setCustomer);

    // Local state for the onboarding form
    const [formData, setFormData] = useState({ name: '', phone: '', table_no: '' });

    // Hydration safety check for Zustand persist
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line
        setMounted(true);
    }, []);

    if (!mounted) return null; // Avoid hydration mismatch on initial render

    // 1. Unauthenticated Gate (No Customer Session)
    if (!customer) {
        return (
            <div className="flex min-h-screen items-center justify-center p-6 relative overflow-hidden bg-[#241B15]">
                {/* Abstract animated backgrounds mapping prestige */}
                <div className="absolute inset-0 z-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#C9974A] via-[#350C0C] to-[#241B15]" />

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="relative z-10 w-full max-w-md bg-[#F6EEDF] p-8 md:p-10 rounded-2xl shadow-2xl overflow-hidden"
                >
                    <h1 className="text-3xl font-bold text-[#4E1414] mb-2 font-display">Welcome.</h1>
                    <p className="text-sm text-[#241B15]/70 mb-8 border-b border-[#C9974A]/20 pb-4">Please enter your details to access the smart menu and begin your dining experience.</p>

                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            setCustomer({
                                name: formData.name,
                                phone: formData.phone,
                                table_no: parseInt(formData.table_no)
                            });
                        }}
                        className="space-y-5"
                    >
                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase tracking-wider text-[#4E1414]">Name</label>
                            <input required type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-white border border-[#C9974A]/30 rounded-lg px-4 py-3 text-[#241B15] focus:outline-none focus:ring-2 focus:ring-[#C9974A]/50 transition-all" placeholder="Enter your full name" />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase tracking-wider text-[#4E1414]">Phone Number</label>
                            <input required type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-white border border-[#C9974A]/30 rounded-lg px-4 py-3 text-[#241B15] focus:outline-none focus:ring-2 focus:ring-[#C9974A]/50 transition-all" placeholder="e.g. +91 9876543210" />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase tracking-wider text-[#4E1414]">Table Number</label>
                            <input required type="number" min="1" value={formData.table_no} onChange={(e) => setFormData({ ...formData, table_no: e.target.value })} className="w-full bg-white border border-[#C9974A]/30 rounded-lg px-4 py-3 text-[#241B15] focus:outline-none focus:ring-2 focus:ring-[#C9974A]/50 transition-all" placeholder="Check your table block" />
                        </div>

                        <button type="submit" className="w-full bg-[#4E1414] hover:bg-[#350C0C] text-[#F6EEDF] font-semibold py-3.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-transform active:scale-[0.98] mt-4 shadow-lg shadow-[#4E1414]/20">
                            Proceed to Menu
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </form>
                </motion.div>
            </div>
        );
    }

    // 2. Authenticated Catalog View
    return (
        <div className="pb-32 bg-[#F6EEDF] min-h-screen">
            {/* Top Nav Block */}
            <header className="sticky top-0 z-40 bg-[#F6EEDF]/90 backdrop-blur-md border-b border-[#C9974A]/20 px-6 py-4 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-display font-bold text-[#4E1414]">Dining Menu</h1>
                    <p className="text-xs text-[#241B15]/60 font-medium">Table {customer.table_no} • {customer.name}</p>
                </div>
            </header>

            {/* Catalog Mapping */}
            <div className="max-w-3xl mx-auto p-6 space-y-12">
                {catalog.categories.map((category) => {
                    const catItems = catalog.menuItems.filter(i => i.category_id === category.id);
                    if (catItems.length === 0) return null; // hide empty categories

                    return (
                        <section key={category.id} className="scroll-mt-24">
                            <h2 className="text-2xl font-display font-bold text-[#350C0C] mb-6 flex items-center gap-4">
                                {category.name}
                                <div className="h-[1px] flex-grow bg-[#C9974A]/30"></div>
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {catItems.map((item) => (
                                    <MenuItemCard key={item.id} item={item} />
                                ))}
                            </div>
                        </section>
                    );
                })}
            </div>

            {/* Floating Cart Indicator */}
            <CartIndicator />
        </div>
    );
}

// Internal reusable component for the generic item card
function MenuItemCard({ item }: { item: import('../lib/types').MenuItem }) {
    const addItem = useCartStore((state) => state.addItem);

    return (
        <div className="bg-white border border-[#C9974A]/15 rounded-xl p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            <div>
                <div className="flex justify-between items-start gap-3 mb-1">
                    <h3 className="font-semibold text-[#241B15]">{item.name}</h3>
                    <span className="font-bold text-[#C9974A] whitespace-nowrap">₹{item.price}</span>
                </div>
            </div>
            <div className="mt-4 flex justify-end">
                <button
                    onClick={() => addItem({ menu_item_id: item.id, name: item.name, price: item.price, qty: 1 })}
                    className="bg-[#F6EEDF] hover:bg-[#C9974A]/20 text-[#4E1414] text-xs font-bold px-4 py-2 rounded-full transition-colors flex items-center gap-1 border border-[#C9974A]/30">
                    <Plus className="w-3 h-3" /> Add
                </button>
            </div>
        </div>
    );
}

// The generic minimalist sticky cart drawer
function CartIndicator() {
    const items = useCartStore((state) => state.items);
    const customer = useCartStore((state) => state.customer);
    const clearCart = useCartStore((state) => state.clearCart);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const total = items.reduce((acc, item) => acc + (item.price * item.qty), 0);
    const totalQty = items.reduce((acc, item) => acc + item.qty, 0);

    // Import action directly in the handler scope for client mapping
    const handleCheckout = async () => {
        if (!customer) return;
        setIsSubmitting(true);
        setErrorMsg("");

        try {
            const { submitCustomerOrder } = await import('../actions/submitOrder');
            const res = await submitCustomerOrder(customer, items);

            if (res.success) {
                setSuccessMsg("Order Sent to Kitchen!");
                setTimeout(() => clearCart(), 2000);
            } else {
                setErrorMsg(res.error || "Failed to submit.");
            }
        } catch {
            setErrorMsg("Network error.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (items.length === 0) return null;

    if (successMsg) {
        return (
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="fixed bottom-6 inset-x-6 z-50 flex justify-center pointer-events-none">
                <div className="w-full max-w-sm bg-[#5C1616] pointer-events-auto rounded-2xl p-6 flex flex-col items-center shadow-2xl border border-[#C9974A]/50">
                    <span className="text-[#C9974A] font-bold text-lg mb-1">{successMsg}</span>
                    <span className="text-[#F6EEDF]/80 text-sm">A waiter is confirming your order.</span>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="fixed bottom-6 inset-x-6 z-50 flex justify-center pointer-events-none"
        >
            <div className="w-full max-w-sm bg-[#4E1414] pointer-events-auto rounded-2xl p-4 flex flex-col items-stretch shadow-2xl border border-[#C9974A]/30 gap-3">

                {errorMsg && (
                    <span className="text-red-400 text-xs font-semibold px-2">{errorMsg}</span>
                )}

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-[#C9974A] text-[#241B15] w-10 h-10 rounded-full flex items-center justify-center font-bold">
                            {totalQty}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[#F6EEDF] text-xs uppercase tracking-wider font-semibold">Total Price</span>
                            <span className="text-white font-bold text-lg leading-none">₹{total}</span>
                        </div>
                    </div>

                    <button
                        onClick={handleCheckout}
                        disabled={isSubmitting}
                        className="bg-[#C9974A] hover:bg-white disabled:opacity-50 text-[#241B15] font-bold px-6 py-2.5 rounded-xl transition-colors shadow-lg"
                    >
                        {isSubmitting ? "Sending..." : "Checkout"}
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
