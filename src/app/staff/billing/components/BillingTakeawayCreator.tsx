"use client";

import { useState, useEffect } from 'react';
import { ShoppingBag, Search, Plus, Minus, X, Check, ChefHat, Play } from 'lucide-react';
import { fmt } from './utils';
import { createTakeawayOrder } from '@/features/ordering/actions/adminActions';
import { supabase } from '@/features/ordering/lib/supabase';

interface Props {
    menuItems: any[];
    takeawayOrdersCount: number;
    onClose: () => void;
    loadData: () => Promise<void>;
    handleSelectTable: (dummyTable: any) => void;
}

export function BillingTakeawayCreator({
    menuItems,
    takeawayOrdersCount,
    onClose,
    loadData,
    handleSelectTable
}: Props) {
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    
    // Customer profile info
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [tokenNo, setTokenNo] = useState('');
    
    // Cart state
    const [cart, setCart] = useState<{ item: any; qty: number }[]>([]);
    const [saving, setSaving] = useState(false);

    // Auto-generate Token sequential number reset daily from 1
    useEffect(() => {
        const fetchDailyToken = async () => {
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            
            const { count, error } = await supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .eq('source', 'takeaway')
                .gte('created_at', startOfToday.toISOString());

            if (!error && count !== null) {
                setTokenNo(`TK-${count + 1}`);
            } else {
                setTokenNo(`TK-${takeawayOrdersCount + 1}`);
            }
        };

        fetchDailyToken();
    }, [takeawayOrdersCount]);

    // Unique Categories list extraction
    const categories = ['All', ...Array.from(new Set(menuItems.map(i => i.categories?.name).filter(Boolean)))];

    // Filtered menu items
    const filteredItems = menuItems.filter(item => {
        if (!item.is_available) return false;
        const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || item.categories?.name === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const handleAddToCart = (item: any) => {
        const inCart = cart.find(i => i.item.id === item.id);
        const currentQty = inCart ? inCart.qty : 0;
        if (item.stock_qty !== null && currentQty >= item.stock_qty) {
            alert(`Sorry, only ${item.stock_qty} portions of ${item.name} are available in the kitchen!`);
            return;
        }
        setCart(prev => {
            const existing = prev.find(i => i.item.id === item.id);
            if (existing) {
                return prev.map(i => i.item.id === item.id ? { ...i, qty: i.qty + 1 } : i);
            }
            return [...prev, { item, qty: 1 }];
        });
    };

    const handleUpdateQty = (itemId: string, diff: number) => {
        setCart(prev => {
            const existing = prev.find(i => i.item.id === itemId);
            if (!existing) return prev;
            if (diff > 0 && existing.item.stock_qty !== null && existing.qty >= existing.item.stock_qty) {
                alert(`Sorry, only ${existing.item.stock_qty} portions of ${existing.item.name} are available in the kitchen!`);
                return prev;
            }
            const newQty = existing.qty + diff;
            if (newQty <= 0) {
                return prev.filter(i => i.item.id !== itemId);
            }
            return prev.map(i => i.item.id === itemId ? { ...i, qty: newQty } : i);
        });
    };

    const getCartTotal = () => {
        return cart.reduce((acc, i) => acc + (i.item.price * i.qty), 0);
    };

    const handleSubmit = async (targetStatus: 'confirmed' | 'preparing') => {
        if (cart.length === 0) {
            alert('Your cart is empty. Please add items to order.');
            return;
        }
        setSaving(true);
        const payload = {
            customer_name: customerName.trim() || 'Takeaway Guest',
            customer_phone: customerPhone.trim() || '0000000000',
            token_no: tokenNo,
            status: targetStatus,
            items: cart.map(i => ({
                menu_item_id: i.item.id,
                qty: i.qty,
                price: i.item.price
            }))
        };

        const result = await createTakeawayOrder(payload);
        if (!result.success) {
            alert(`Failed to save takeaway order: ${result.error}`);
            setSaving(false);
            return;
        }

        await loadData();

        // If direct checkout/confirmed is chosen, immediately select this order for settle billing!
        if (targetStatus === 'confirmed' && result.orderId) {
            const total = getCartTotal();
            handleSelectTable({
                id: result.orderId,
                table_no: 0,
                status: 'Awaiting Settlement',
                currentBill: total,
                customer_name: payload.customer_name,
                customer_phone: payload.customer_phone,
                orders: [{
                    id: result.orderId,
                    status: 'confirmed',
                    created_at: new Date().toISOString(),
                    customer_name: payload.customer_name,
                    customer_phone: payload.customer_phone,
                    table_id: null,
                    restaurant_tables: null,
                    token_no: tokenNo,
                    order_items: cart.map(i => ({
                        id: Math.random().toString(),
                        qty: i.qty,
                        price_at_order: i.item.price,
                        menu_items: { name: i.item.name, is_veg: i.item.is_veg, id: i.item.id }
                    }))
                }],
                latestStatus: 'confirmed'
            });
        }

        setSaving(false);
        onClose();
    };

    return (
        <div className="bg-white border border-[#C9974A]/30 rounded-2xl shadow-sm p-6 space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <h3 className="font-extrabold text-[#4E1414] text-base flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-[#C9974A]" /> Create Takeaway / Parcel Order
                </h3>
                <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* Left Side: Items selection (xl:col-span-7) */}
                <div className="xl:col-span-7 space-y-4">
                    {/* Search and Categories */}
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                            <input
                                type="text"
                                placeholder="Search menu items..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-[#241B15] focus:bg-white outline-none focus:border-[#C9974A] transition-colors"
                            />
                        </div>
                        <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full md:max-w-xs taj-scrollbar">
                            {categories.map((cat: any) => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-3 py-2.5 rounded-xl text-[10px] font-black uppercase whitespace-nowrap border transition-all cursor-pointer
                                        ${selectedCategory === cat 
                                            ? 'bg-[#4E1414] border-[#4E1414] text-[#F6EEDF]' 
                                            : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Items Grid list */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-1 taj-scrollbar-dark">
                        {filteredItems.map(item => {
                            const inCart = cart.find(i => i.item.id === item.id);
                            return (
                                <div 
                                    key={item.id} 
                                    onClick={() => handleAddToCart(item)}
                                    className="bg-gray-50 hover:bg-[#F6EEDF]/20 border border-gray-100 hover:border-[#C9974A]/30 rounded-xl p-3.5 flex justify-between items-center transition-all cursor-pointer relative overflow-hidden"
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`w-2 h-2 rounded-full ${item.is_veg ? 'bg-green-500' : 'bg-red-500'}`} />
                                            <h4 className="font-extrabold text-xs text-[#4E1414]">{item.name}</h4>
                                        </div>
                                        <p className="text-[10px] text-[#C9974A] font-extrabold flex items-center gap-1.5">
                                            <span>{fmt(item.price)}</span>
                                            {item.stock_qty !== null && (
                                                <span className="text-[9px] bg-amber-100 text-amber-850 border border-amber-200 px-1.5 py-0.5 rounded font-black">
                                                    {item.stock_qty <= 3 ? `Ending: ${item.stock_qty} Left` : `${item.stock_qty} Qty`}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    {inCart ? (
                                        <span className="w-6 h-6 rounded-full bg-[#4E1414] text-[#F6EEDF] font-black text-xs flex items-center justify-center">
                                            {inCart.qty}
                                        </span>
                                    ) : (
                                        <Plus className="w-4 h-4 text-gray-400 hover:text-[#4E1414]" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right Side: Cart list and details (xl:col-span-5) */}
                <div className="xl:col-span-5 bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                    <div className="space-y-4">
                        <h4 className="font-extrabold text-xs text-[#4E1414] pb-2 border-b border-gray-200 uppercase tracking-wide">
                            Order Overview
                        </h4>

                        {/* Customer details input */}
                        <div className="grid grid-cols-1 gap-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[9px] font-black text-[#4E1414]/50 uppercase tracking-wider mb-1">
                                        Guest Name
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Walk-in Guest"
                                        value={customerName}
                                        onChange={e => setCustomerName(e.target.value)}
                                        className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#241B15] outline-none focus:border-[#C9974A] transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-[#4E1414]/50 uppercase tracking-wider mb-1">
                                        Contact Phone
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Optional"
                                        value={customerPhone}
                                        onChange={e => setCustomerPhone(e.target.value)}
                                        className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#241B15] outline-none focus:border-[#C9974A] transition-colors"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-[#4E1414]/50 uppercase tracking-wider mb-1">
                                    Takeaway Token Number
                                </label>
                                <input
                                    type="text"
                                    value={tokenNo}
                                    onChange={e => setTokenNo(e.target.value)}
                                    className="w-full bg-[#4E1414]/5 border border-[#4E1414]/10 rounded-lg px-2.5 py-1.5 text-xs font-black text-[#4E1414] outline-none"
                                />
                            </div>
                        </div>

                        {/* Selected items cart list */}
                        <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1 taj-scrollbar-dark">
                            {cart.map((i, idx) => (
                                <div key={idx} className="bg-white border border-gray-100 rounded-xl p-2.5 flex justify-between items-center shadow-xs">
                                    <div className="max-w-[60%]">
                                        <h5 className="font-extrabold text-[11px] text-[#4E1414] truncate">{i.item.name}</h5>
                                        <p className="text-[9px] text-[#C9974A] font-extrabold">{fmt(i.item.price * i.qty)}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => handleUpdateQty(i.item.id, -1)}
                                            className="w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
                                        >
                                            <Minus className="w-3 h-3" />
                                        </button>
                                        <span className="font-black text-xs text-[#4E1414] min-w-[12px] text-center">
                                            {i.qty}
                                        </span>
                                        <button 
                                            onClick={() => handleUpdateQty(i.item.id, 1)}
                                            className="w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
                                        >
                                            <Plus className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {cart.length === 0 && (
                                <div className="text-center py-8 text-gray-400 text-xs italic font-semibold border border-dashed border-gray-200 rounded-xl">
                                    No items in cart
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom Summary & Actions */}
                    <div className="space-y-3 pt-3 border-t border-gray-200">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-500">Grand Total:</span>
                            <span className="text-sm font-black text-[#C9974A]">{fmt(getCartTotal())}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                            <button
                                disabled={saving || cart.length === 0}
                                onClick={() => handleSubmit('preparing')}
                                className="flex items-center justify-center gap-1 bg-[#4E1414] hover:bg-[#380e0e] text-[#F6EEDF] font-bold text-xs py-2.5 rounded-xl transition-all disabled:opacity-40 shadow cursor-pointer"
                            >
                                <ChefHat className="w-4 h-4 text-[#C9974A]" /> Send to KOT
                            </button>
                            <button
                                disabled={saving || cart.length === 0}
                                onClick={() => handleSubmit('confirmed')}
                                className="flex items-center justify-center gap-1 bg-[#C9974A] hover:bg-[#b08137] text-white font-bold text-xs py-2.5 rounded-xl transition-all disabled:opacity-40 shadow cursor-pointer"
                            >
                                <Check className="w-4 h-4" /> Settle & Pay
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
