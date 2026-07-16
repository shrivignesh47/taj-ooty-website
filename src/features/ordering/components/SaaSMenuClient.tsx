"use client";

import React, { useState, useEffect, useRef } from 'react';
import { MenuCatalog } from '../api/getCatalog';
import { useCartStore } from '../store/useCartStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, Search, ShoppingBag, X, Loader2 } from 'lucide-react';
import { CustomerOrderStatus } from './CustomerOrderStatus';
import { supabase } from '../lib/supabase';
import { getOrCreateTableAndCheckOccupied } from '../actions/waiterActions';

export function SaaSMenuClient({ catalog, initialTableNo }: { catalog: MenuCatalog, initialTableNo?: number }) {
    const customer = useCartStore((state) => state.customer);
    const setCustomer = useCartStore((state) => state.setCustomer);
    const setActiveOrder = useCartStore((state) => state.setActiveOrder);
    const isOnboarded = useCartStore((state) => state.isOnboarded);
    const setOnboarded = useCartStore((state) => state.setOnboarded);

    const [mounted, setMounted] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState(catalog.categories[0]?.id || '');
    const navRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

    // IntersectionObserver logic for category pills
    useEffect(() => {
        if (!mounted || !isOnboarded || searchQuery.trim() !== '') return;
        
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const id = entry.target.id.replace('category-', '');
                        setActiveCategory(id);
                        const pill = document.getElementById(`pill-${id}`);
                        if (pill && navRef.current) {
                            pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                        }
                    }
                });
            },
            { rootMargin: '-180px 0px -50% 0px', threshold: 0.1 }
        );

        catalog.categories.forEach(cat => {
            const el = document.getElementById(`category-${cat.id}`);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [mounted, isOnboarded, catalog.categories, searchQuery]);

    const scrollToCategory = (id: string) => {
        setActiveCategory(id);
        const el = document.getElementById(`category-${id}`);
        if (el) {
            const y = el.getBoundingClientRect().top + window.scrollY - 160;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    };

    if (!mounted) return null;

    // 1. Active Order Tracker
    if (customer?.active_order_id) {
        return <CustomerOrderStatus orderId={customer.active_order_id} />;
    }

    // 2. Onboarding Screen
    if (!isOnboarded) {
        return <OnboardingScreen initialTableNo={initialTableNo} setCustomer={setCustomer} setOnboarded={setOnboarded} />;
    }

    // 3. Menu Filtering
    const filteredCategories = catalog.categories.filter(cat => {
        const hasItems = catalog.menuItems.some(i => i.category_id === cat.id && i.name.toLowerCase().includes(searchQuery.toLowerCase()));
        return hasItems;
    });

    return (
        <div className="max-w-[430px] mx-auto min-h-screen bg-[#F6EEDF] relative shadow-2xl pb-32">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-[#F6EEDF] border-b border-[#C9974A]/10 shadow-sm flex flex-col">
                <div className="px-5 py-4 flex items-center justify-between">
                    <div className="w-8 h-8 rounded-full bg-white border border-[#C9974A]/30 overflow-hidden flex items-center justify-center shrink-0">
                        <span className="font-bold text-[#4E1414] text-xs">TAJ</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <h1 className="text-xl font-display font-bold text-[#4E1414] leading-tight">Menu</h1>
                        <p className="text-[10px] text-[#C9974A] font-bold uppercase tracking-wider">Hi, {customer?.name}!</p>
                    </div>
                    <div className="w-8 h-8 relative flex items-center justify-center shrink-0">
                        <ShoppingBag className="w-5 h-5 text-[#241B15]" />
                        <CartBadge />
                    </div>
                </div>

                <div className="px-5 pb-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#241B15]/40" />
                        <input
                            type="text"
                            placeholder="Search dishes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#C9974A]/20 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C9974A] transition-shadow shadow-sm"
                        />
                    </div>
                    <div className="mt-3 flex items-center justify-center">
                        <span className="bg-[#4E1414]/10 text-[#4E1414] font-bold text-[10px] uppercase tracking-wider px-3 py-1 rounded-full">
                            Table {customer?.table_no}
                        </span>
                    </div>
                </div>

                {/* Horizontal Category Nav */}
                <div ref={navRef} className="flex overflow-x-auto hide-scrollbar px-5 pb-3 gap-2">
                    {filteredCategories.map(cat => (
                        <button
                            key={cat.id}
                            id={`pill-${cat.id}`}
                            onClick={() => scrollToCategory(cat.id)}
                            className={`whitespace-nowrap px-4 py-2 min-h-[36px] rounded-full text-sm font-semibold transition-colors
                                ${activeCategory === cat.id ? 'bg-[#4E1414] text-[#F6EEDF]' : 'bg-transparent border border-[#241B15] text-[#241B15]'}`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </header>

            {/* Catalog Mapping */}
            <div className="p-0">
                {filteredCategories.length === 0 && (
                    <div className="flex flex-col items-center justify-center pt-20 px-6 text-center">
                        <Search className="w-12 h-12 text-[#C9974A]/40 mb-4" />
                        <p className="text-[#241B15]/70 font-medium">No items found for &quot;{searchQuery}&quot;</p>
                    </div>
                )}
                
                {filteredCategories.map((category) => {
                    const catItems = catalog.menuItems.filter(i => 
                        i.category_id === category.id && 
                        i.name.toLowerCase().includes(searchQuery.toLowerCase())
                    );

                    return (
                        <section key={category.id} id={`category-${category.id}`} className="scroll-mt-44">
                            {/* Sticky Subheader */}
                            <div className="sticky top-[168px] z-20 bg-[#F6EEDF]/95 backdrop-blur-sm px-5 py-2 border-b border-[#C9974A]/10">
                                <h2 className="text-lg font-display font-bold text-[#350C0C]">
                                    {category.name}
                                </h2>
                            </div>
                            
                            {/* Single Column List */}
                            <div className="flex flex-col px-5">
                                {catItems.map((item) => (
                                    <CompactMobileItemRow key={item.id} item={item} />
                                ))}
                            </div>
                        </section>
                    );
                })}
            </div>

            {/* Simplified Cart Drawer Manager */}
            <CartDrawerManager setActiveOrder={setActiveOrder} customer={customer} />
        </div>
    );
}

// -------------------------------------------------------------
// Onboarding Screen
// -------------------------------------------------------------
function OnboardingScreen({ initialTableNo, setCustomer, setOnboarded }: { initialTableNo?: number, setCustomer: (session: import('../store/useCartStore').CustomerSession) => void, setOnboarded: (s: boolean) => void }) {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [manualTableNo, setManualTableNo] = useState('');
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const isPhoneValid = phone.replace(/\D/g, '').length === 10;
    const canSubmit = name.trim().length >= 2 && isPhoneValid && (initialTableNo || manualTableNo.trim().length > 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;
        
        setIsSubmitting(true);
        setErrorMsg('');

        try {
            let finalTableNo = initialTableNo;

            // Validate manual or initial table number
            if (!finalTableNo) {
                const res = await getOrCreateTableAndCheckOccupied(parseInt(manualTableNo));
                if (!res.success) {
                    setErrorMsg(res.error || "Table already occupied. Enter correct table number.");
                    setIsSubmitting(false);
                    return;
                }
                finalTableNo = res.tableNo;
            } else {
                const res = await getOrCreateTableAndCheckOccupied(finalTableNo);
                if (!res.success) {
                    setErrorMsg(res.error || "Table already occupied.");
                    setIsSubmitting(false);
                    return;
                }
            }

            setCustomer({
                name: name.trim(),
                phone: phone.replace(/\D/g, ''),
                table_no: finalTableNo!
            });
            setOnboarded(true);
        } catch {
            setErrorMsg("Network error verifying table.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-[430px] mx-auto min-h-screen bg-[#F6EEDF] relative shadow-2xl flex flex-col items-center justify-center p-6">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full bg-white p-8 rounded-3xl shadow-sm border border-[#C9974A]/20 flex flex-col items-center"
            >
                <div className="w-16 h-16 rounded-full bg-[#F6EEDF] border border-[#C9974A]/30 overflow-hidden flex items-center justify-center mb-6">
                    <span className="font-bold text-[#4E1414] text-xl">TAJ</span>
                </div>
                <h1 className="text-2xl font-display font-bold text-[#4E1414] mb-2 text-center">Welcome to Hotel Taj Ooty</h1>
                <p className="text-[#241B15]/70 text-sm text-center mb-8">Place your order below &mdash; we&apos;ll bring it right to your table.</p>

                <form onSubmit={handleSubmit} className="w-full space-y-5">
                    {errorMsg && <p className="text-red-500 text-xs font-bold text-center">{errorMsg}</p>}
                    
                    <div className="space-y-1">
                        <label className="text-[11px] font-bold text-[#241B15]/70 uppercase tracking-wider pl-2">Your Name</label>
                        <input 
                            required 
                            type="text" 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            className="w-full bg-[#F6EEDF] border-none rounded-2xl px-5 py-4 text-[16px] text-[#241B15] focus:ring-2 focus:ring-[#C9974A]/50 placeholder:text-[#241B15]/30 min-h-[52px]" 
                            placeholder="Enter your name"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[11px] font-bold text-[#241B15]/70 uppercase tracking-wider pl-2">Phone Number</label>
                        <input 
                            required 
                            type="tel" 
                            inputMode="numeric"
                            maxLength={10}
                            value={phone} 
                            onChange={e => {
                                const val = e.target.value.replace(/\D/g, '');
                                if (val.length <= 10) setPhone(val);
                            }} 
                            className={`w-full bg-[#F6EEDF] border-none rounded-2xl px-5 py-4 text-[16px] text-[#241B15] focus:ring-2 focus:ring-[#C9974A]/50 placeholder:text-[#241B15]/30 min-h-[52px] ${phone.length > 0 && !isPhoneValid ? 'ring-2 ring-red-400/50' : ''}`} 
                            placeholder="10-digit mobile number"
                        />
                        {phone.length > 0 && !isPhoneValid && <p className="text-[10px] text-red-500 font-bold mt-1 pl-2">10 digits required</p>}
                    </div>

                    {initialTableNo ? (
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-[#241B15]/70 uppercase tracking-wider pl-2">Table Number</label>
                            <div className="w-full bg-[#4E1414]/5 border border-[#4E1414]/10 rounded-2xl px-5 py-4 min-h-[52px] flex items-center text-[#4E1414] font-bold">
                                Table {initialTableNo} ✓
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-[#241B15]/70 uppercase tracking-wider pl-2">Table Number</label>
                            <input 
                                required 
                                type="number" 
                                inputMode="numeric"
                                value={manualTableNo} 
                                onChange={e => setManualTableNo(e.target.value)} 
                                className="w-full bg-[#F6EEDF] border-none rounded-2xl px-5 py-4 text-[16px] text-[#241B15] focus:ring-2 focus:ring-[#C9974A]/50 placeholder:text-[#241B15]/30 min-h-[52px]" 
                                placeholder="Enter table number"
                            />
                        </div>
                    )}

                    <button 
                        type="submit"
                        disabled={isSubmitting || !canSubmit}
                        className="w-full mt-4 bg-[#4E1414] hover:bg-[#350C0C] disabled:opacity-50 disabled:bg-[#4E1414]/50 text-[#C9974A] font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center min-h-[56px] text-lg"
                    >
                        {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin text-[#F6EEDF]" /> : 'Start Ordering →'}
                    </button>
                </form>
            </motion.div>
        </div>
    );
}

// -------------------------------------------------------------
// Badge Component
// -------------------------------------------------------------
function CartBadge() {
    const items = useCartStore((state) => state.items);
    const totalQty = items.reduce((acc, item) => acc + item.qty, 0);
    if (totalQty === 0) return null;
    return (
        <span className="absolute -top-1 -right-1 bg-[#C9974A] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
            {totalQty}
        </span>
    );
}

// -------------------------------------------------------------
// Compact Mobile Item Row
// -------------------------------------------------------------
function CompactMobileItemRow({ item }: { item: any }) {
    const items = useCartStore((state) => state.items);
    const addItem = useCartStore((state) => state.addItem);
    const updateQty = useCartStore((state) => state.updateQty);
    
    const cartItem = items.find(i => i.menu_item_id === item.id);
    const qty = cartItem ? cartItem.qty : 0;

    const handleIncrement = () => {
        if (item.stock_qty !== null && qty >= item.stock_qty) {
            alert(`Sorry, only ${item.stock_qty} portions of ${item.name} are available in the kitchen!`);
            return;
        }
        if (qty === 0) {
            addItem({ menu_item_id: item.id, name: item.name, price: item.price, qty: 1 });
        } else {
            updateQty(cartItem!.id, qty + 1);
        }
    };

    return (
        <div className="flex items-center justify-between py-4 border-b border-[#241B15]/5">
            <div className="flex-1 pr-3">
                <h3 className="font-medium text-[#241B15] text-[16px] leading-snug break-words">{item.name}</h3>
                {item.stock_qty !== null && (
                    <span className="text-[10px] bg-amber-100 text-amber-850 border border-amber-200 rounded px-1.5 py-0.5 mt-1 inline-block font-bold">
                        {item.stock_qty <= 3 ? `Ending Soon: ${item.stock_qty} Left` : `${item.stock_qty} Available`}
                    </span>
                )}
            </div>
            <div className="flex items-center gap-4 shrink-0">
                <span className="font-bold text-[#C9974A] text-[14px]">₹{item.price}</span>
                
                {qty === 0 ? (
                    <motion.button
                        whileTap={{ scale: 0.92 }}
                        onClick={handleIncrement}
                        className="bg-white border border-[#C9974A]/30 text-[#4E1414] w-[44px] h-[36px] rounded-lg flex items-center justify-center shadow-sm cursor-pointer font-bold text-xs"
                    >
                        ADD
                    </motion.button>
                ) : (
                    <div className="flex items-center bg-white border border-[#C9974A]/30 rounded-lg shadow-sm h-[36px] overflow-hidden">
                        <motion.button 
                            whileTap={{ scale: 0.92 }}
                            onClick={() => updateQty(cartItem!.id, qty - 1)} 
                            className="w-[36px] h-full flex items-center justify-center text-[#4E1414] bg-white active:bg-black/5 cursor-pointer"
                        >
                            <Minus className="w-3 h-3" />
                        </motion.button>
                        <span className="text-[14px] font-bold text-[#4E1414] w-[24px] text-center">{qty}</span>
                        <motion.button 
                            whileTap={{ scale: 0.92 }}
                            onClick={handleIncrement} 
                            className="w-[36px] h-full flex items-center justify-center text-[#4E1414] bg-white active:bg-black/5 cursor-pointer"
                        >
                            <Plus className="w-3 h-3" />
                        </motion.button>
                    </div>
                )}
            </div>
        </div>
    );
}

// -------------------------------------------------------------
// Simplified Cart Drawer Manager
// -------------------------------------------------------------
function CartDrawerManager({ setActiveOrder, customer }: { setActiveOrder: (id: string) => void, customer: import('../store/useCartStore').CustomerSession | null }) {
    const items = useCartStore((state) => state.items);
    const updateQty = useCartStore((state) => state.updateQty);
    const clearCart = useCartStore((state) => state.clearCart);
    
    const [isOpen, setIsOpen] = useState(false);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const total = items.reduce((acc, item) => acc + (item.price * item.qty), 0);
    const totalQty = items.reduce((acc, item) => acc + item.qty, 0);

    if (items.length === 0) {
        if (isOpen) setIsOpen(false);
        return null;
    }

    const handleCheckout = async () => {
        if (!customer) return;
        setIsSubmitting(true);
        setErrorMsg('');

        const submittedItems = items.map((i, idx) => idx === 0 && notes ? { ...i, notes } : i);
        
        try {
            const { submitCustomerOrder } = await import('../actions/submitOrder');
            const res = await submitCustomerOrder(customer, submittedItems);

            if (res.success && res.orderId) {
                setActiveOrder(res.orderId);
                clearCart();
                setIsOpen(false);
            } else {
                setErrorMsg(res.error || "Failed to submit.");
            }
        } catch {
            setErrorMsg("Network error.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            {/* Floating Cart Bar */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.div
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        exit={{ y: 100 }}
                        className="fixed bottom-0 max-w-[430px] w-full z-40 bg-[#4E1414] p-4 pb-safe-offset-4 rounded-t-3xl shadow-[0_-10px_40px_rgba(78,20,20,0.3)] cursor-pointer"
                        onClick={() => setIsOpen(true)}
                    >
                        <div className="flex items-center justify-between text-[#F6EEDF]">
                            <div className="flex items-center gap-2">
                                <span className="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                                    {totalQty}
                                </span>
                                <span className="font-semibold text-sm">items · ₹{total}</span>
                            </div>
                            <div className="flex items-center font-bold text-sm">
                                View Cart <ShoppingBag className="w-4 h-4 ml-2" />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Backdrop */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm max-w-[430px] mx-auto"
                    />
                )}
            </AnimatePresence>

            {/* Sliding Drawer */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > 100 || info.velocity.y > 500) {
                                setIsOpen(false);
                            }
                        }}
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 max-w-[430px] w-full z-50 bg-[#F6EEDF] rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
                    >
                        {/* Handle */}
                        <div className="w-full flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
                            <div className="w-12 h-1.5 bg-[#C9974A]/40 rounded-full" />
                        </div>
                        
                        <div className="px-6 pb-3 flex justify-between items-center border-b border-[#C9974A]/20">
                            <h2 className="text-xl font-display font-bold text-[#4E1414]">Your Order</h2>
                            <button onClick={() => setIsOpen(false)} className="p-2 bg-white rounded-full text-[#4E1414] shadow-sm">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="overflow-y-auto px-6 py-4 flex-1 space-y-4">
                            {errorMsg && <p className="text-red-500 text-xs font-bold text-center bg-red-50 p-2 rounded">{errorMsg}</p>}
                            
                            {/* Items List */}
                            <div className="space-y-0">
                                {items.map(item => (
                                    <div key={item.id} className="flex justify-between items-center py-3 border-b border-[#241B15]/5">
                                        <div className="flex-1 pr-2">
                                            <h4 className="font-medium text-sm text-[#241B15]">{item.name}</h4>
                                            <p className="text-xs text-[#C9974A] font-bold">₹{item.price}</p>
                                        </div>
                                        <div className="flex items-center gap-3 bg-white border border-[#C9974A]/20 rounded-lg p-1 shadow-sm">
                                            <button onClick={() => updateQty(item.id, item.qty - 1)} className="p-1 text-[#4E1414]"><Minus className="w-3 h-3" /></button>
                                            <span className="text-sm font-bold text-[#4E1414] w-4 text-center">{item.qty}</span>
                                            <button onClick={() => updateQty(item.id, item.qty + 1)} className="p-1 text-[#4E1414]"><Plus className="w-3 h-3" /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Order Notes */}
                            <div className="space-y-1 mt-4">
                                <label className="text-[11px] font-bold text-[#241B15]/70 uppercase tracking-wider">Any special requests?</label>
                                <textarea 
                                    value={notes} 
                                    onChange={e => setNotes(e.target.value)} 
                                    onFocus={e => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                                    className="w-full bg-white border border-[#C9974A]/20 shadow-sm rounded-xl px-4 py-3 text-sm text-[#241B15] focus:outline-none focus:ring-2 focus:ring-[#C9974A]/50 min-h-[80px]" 
                                    placeholder="E.g. less spicy, extra napkins..."
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="bg-white border-t border-[#C9974A]/20 p-5 flex items-center justify-between pb-safe-offset-5 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                            <div>
                                <p className="text-[11px] text-[#241B15]/60 font-semibold uppercase tracking-wider">Subtotal</p>
                                <p className="text-xl font-black text-[#4E1414]">₹{total}</p>
                            </div>
                            <button 
                                onClick={handleCheckout}
                                disabled={isSubmitting}
                                className="bg-[#4E1414] hover:bg-[#350C0C] disabled:opacity-50 disabled:bg-[#4E1414]/50 text-[#C9974A] font-bold px-8 py-3.5 rounded-xl shadow-lg transition-all flex items-center gap-2 min-w-[150px] justify-center"
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin text-[#F6EEDF]" /> : 'Place Order →'}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
