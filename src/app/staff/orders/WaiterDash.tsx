/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useLiveOrders } from '@/features/ordering/hooks/useLiveOrders';
import { Utensils, User, History, Plus, AlertTriangle, Search, X, Trash2, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { IncomingOrders } from './components/IncomingOrders';
import { ActiveOrders } from './components/ActiveOrders';
import { OrderHistory } from './components/OrderHistory';
import { resetStaffPassword } from '@/features/ordering/actions/staffActions';
import { logoutStaff } from '@/features/ordering/actions/auth';
import { submitWaiterOrder } from '@/features/ordering/actions/waiterActions';
import { MenuCatalog } from '@/features/ordering/api/getCatalog';

export function WaiterDash({ activeUser, catalog }: { activeUser: any, catalog?: MenuCatalog }) {
    // Waiters track everything from pending up to served to know when to bill
    const { orders, loading } = useLiveOrders(['pending', 'confirmed', 'preparing', 'ready', 'served']);
    const [tab, setTab] = useState<'incoming' | 'active' | 'history' | 'settings' | 'pos'>('incoming');

    const [posCatalog, setPosCatalog] = useState<MenuCatalog | null>(catalog || null);
    const [posTableContext, setPosTableContext] = useState<string>('');

    useEffect(() => {
        if (!posCatalog) {
            // If catalog not passed as prop, fetch it for POS
            import('@/features/ordering/api/getCatalog').then(m => m.getLiveCatalog()).then(setPosCatalog);
        }
    }, [posCatalog]);

    if (loading) {
        return <div className="text-[#C9974A] font-bold animate-pulse text-center py-20 mt-10">Loading Station...</div>;
    }

    // Orders without a waiter (Incoming Queue)
    const unclaimed = orders.filter(o => o.status === 'pending' && !o.waiter_id);
    
    // Stale indicator
    const staleUnclaimed = unclaimed.filter(o => (new Date().getTime() - new Date(o.created_at).getTime()) > 5 * 60 * 1000);

    // Active orders claimed by me (not pending, not yet billed)
    // Actually, if a waiter claimed a pending order but didn't confirm it... wait! We changed "claim" to instantly confirm.
    // So pending is ONLY in incoming. If they are mine, they are confirmed, preparing, ready, or served.
    const myActiveOrders = orders.filter(o => o.waiter_id === activeUser.id && o.status !== 'pending');

    const openPOSForTable = (tableNo: number) => {
        setPosTableContext(tableNo.toString());
        setTab('pos');
    };

    return (
        <div className="max-w-md mx-auto relative pb-28 pt-4">
            {/* Top Navigation Tabs */}
            <div className="px-4 mb-4 flex gap-2 overflow-x-auto hide-scrollbar">
                <button 
                    onClick={() => setTab('incoming')}
                    className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-colors ${tab === 'incoming' ? 'bg-[#4E1414] text-[#F6EEDF]' : 'bg-white border border-[#C9974A]/30 text-[#4E1414]'}`}
                >
                    Incoming Queue
                    {unclaimed.length > 0 && (
                        <span className="bg-red-600 text-white w-5 h-5 rounded-full text-[10px] flex items-center justify-center animate-pulse">
                            {unclaimed.length}
                        </span>
                    )}
                </button>
                <button 
                    onClick={() => setTab('active')}
                    className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-colors ${tab === 'active' ? 'bg-[#4E1414] text-[#F6EEDF]' : 'bg-white border border-[#C9974A]/30 text-[#4E1414]'}`}
                >
                    My Tables
                    {myActiveOrders.length > 0 && (
                        <span className="bg-[#C9974A] text-[#4E1414] w-5 h-5 rounded-full text-[10px] flex items-center justify-center">
                            {myActiveOrders.length}
                        </span>
                    )}
                </button>
                <button 
                    onClick={() => setTab('history')}
                    className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-colors ${tab === 'history' ? 'bg-[#4E1414] text-[#F6EEDF]' : 'bg-white border border-[#C9974A]/30 text-[#4E1414]'}`}
                >
                    <History className="w-4 h-4" /> History
                </button>
            </div>

            <div className="px-4">
                {staleUnclaimed.length > 0 && tab !== 'incoming' && (
                    <div className="bg-red-100 border border-red-300 text-red-800 px-3 py-2 rounded-lg text-xs font-bold mb-4 flex items-center gap-2 animate-pulse cursor-pointer" onClick={() => setTab('incoming')}>
                        <AlertTriangle className="w-4 h-4" />
                        {staleUnclaimed.length} orders are waiting for over 5 minutes!
                    </div>
                )}

                {tab === 'incoming' && <IncomingOrders orders={unclaimed} activeUser={activeUser} catalog={posCatalog} />}
                {tab === 'active' && <ActiveOrders orders={myActiveOrders} activeUser={activeUser} onAddItems={openPOSForTable} />}
                {tab === 'history' && <OrderHistory activeUser={activeUser} />}
                {tab === 'pos' && posCatalog && <WaiterPOS activeUser={activeUser} catalog={posCatalog} initialTableNo={posTableContext} onClose={() => { setTab('active'); setPosTableContext(''); }} />}
                {tab === 'settings' && <WaiterSettings activeUser={activeUser} />}
            </div>

            {/* Bottom Nav for POS & Settings */}
            <div className="fixed bottom-0 left-0 right-0 bg-[#350C0C] text-[#F6EEDF] p-4 flex justify-around shadow-2xl z-40 rounded-t-3xl border-t border-[#C9974A]/40 max-w-md mx-auto">
                <button onClick={() => setTab('active')} className={`flex flex-col items-center gap-1 transition-colors ${['incoming','active','history'].includes(tab) ? 'text-[#C9974A]' : 'opacity-60 hover:opacity-100'}`}>
                    <Utensils className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Tables</span>
                </button>
                <div className="relative -top-8">
                    <button onClick={() => setTab('pos')} className="bg-[#C9974A] text-[#350C0C] p-4 rounded-full shadow-[0_0_20px_rgba(201,151,74,0.4)] hover:scale-105 transition-transform">
                        <Plus className="w-6 h-6" />
                    </button>
                </div>
                <button onClick={() => setTab('settings')} className={`flex flex-col items-center gap-1 transition-colors ${tab === 'settings' ? 'text-[#C9974A]' : 'opacity-60 hover:opacity-100'}`}>
                    <User className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Profile</span>
                </button>
            </div>
        </div>
    );
}

// ----------------------------------------------------------------------
// PRESERVED WAITER POS
// ----------------------------------------------------------------------
type CartItemPOS = { menu_item_id: string, name: string, price: number, qty: number, notes?: string };
function WaiterPOS({ activeUser, catalog, initialTableNo = '', onClose }: { activeUser: any, catalog: MenuCatalog, initialTableNo?: string, onClose: () => void }) {
    const [cart, setCart] = useState<CartItemPOS[]>([]);
    const [tableNo, setTableNo] = useState(initialTableNo);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>(catalog.categories[0]?.id || '');
    const [submitting, setSubmitting] = useState(false);

    const addToCart = (item: any) => {
        setCart(prev => {
            const exists = prev.find(i => i.menu_item_id === item.id);
            if (exists) return prev.map(i => i.menu_item_id === item.id ? { ...i, qty: i.qty + 1 } : i);
            return [...prev, { menu_item_id: item.id, name: item.name, price: Number(item.price), qty: 1 }];
        });
    };

    const updateQty = (itemId: string, diff: number) => {
        setCart(prev => prev.map(i => {
            if (i.menu_item_id === itemId) {
                const newQty = i.qty + diff;
                return newQty > 0 ? { ...i, qty: newQty } : null;
            }
            return i;
        }).filter(Boolean) as CartItemPOS[]);
    };

    const updateNotes = (itemId: string, notes: string) => {
        setCart(prev => prev.map(i => i.menu_item_id === itemId ? { ...i, notes } : i));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const parsedTable = parseInt(tableNo);
        if (isNaN(parsedTable) || parsedTable <= 0) return alert('Please enter a valid table number');
        if (cart.length === 0) return alert('Cart is empty.');

        setSubmitting(true);
        const res = await submitWaiterOrder(activeUser.id, parsedTable, customerName, customerPhone, cart);
        setSubmitting(false);

        if (res.success) {
            alert(`Order submitted successfully for Table ${parsedTable}!`);
            onClose();
        } else {
            alert('Failed to submit order: ' + res.error);
        }
    };

    const filteredItems = catalog.menuItems.filter(item => {
        const matchesCategory = selectedCategory ? item.category_id === selectedCategory : true;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-[#C9974A]/20 overflow-hidden flex flex-col h-[80vh]">
            <div className="bg-[#4E1414] text-white p-4 flex justify-between items-center shrink-0">
                <div>
                    <h2 className="font-display font-bold text-lg">Add to Table {tableNo}</h2>
                    <p className="text-xs text-[#C9974A] font-semibold">New Order / Add-on</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X className="w-5 h-5" /></button>
            </div>

            {/* Menu Section (Scrollable) */}
            <div className="flex-1 flex flex-col min-h-0 bg-[#F6EEDF]/30">
                <div className="p-3 space-y-3 bg-white border-b border-[#C9974A]/20 shrink-0 shadow-sm z-10">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#C9974A]" />
                        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search menu..." className="w-full bg-gray-50 border border-[#C9974A]/30 rounded-xl pl-9 pr-4 py-2 text-sm font-semibold focus:outline-none focus:border-[#4E1414]" />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                        {catalog.categories.map(cat => (
                            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-4 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-colors ${selectedCategory === cat.id ? 'bg-[#4E1414] text-white' : 'bg-[#F6EEDF] border border-[#C9974A]/30 text-[#4E1414]'}`}>{cat.name}</button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {filteredItems.map(item => (
                        <div key={item.id} className="bg-white border border-[#C9974A]/20 p-3 rounded-xl flex justify-between items-center shadow-sm">
                            <div>
                                <h4 className="font-bold text-sm text-[#241B15]">{item.name}</h4>
                                <p className="font-black text-xs text-[#C9974A] mt-0.5">₹{item.price}</p>
                            </div>
                            <button onClick={() => addToCart(item)} className="bg-[#F6EEDF] text-[#4E1414] px-4 py-2 rounded-lg font-bold text-xl active:scale-95">+</button>
                        </div>
                    ))}
                    {filteredItems.length === 0 && <p className="text-center text-[#241B15]/50 py-10 font-bold">No items found.</p>}
                </div>
            </div>

            {/* Cart Section (Sticky Bottom) */}
            <div className="bg-white border-t border-[#C9974A]/30 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] shrink-0 flex flex-col max-h-[40vh]">
                <div className="bg-[#F6EEDF] p-2 text-center text-[10px] font-black uppercase text-[#4E1414] tracking-widest border-b border-[#C9974A]/20">
                    Current Cart ({cart.reduce((s,i) => s + i.qty, 0)} Items)
                </div>
                
                {cart.length > 0 ? (
                    <div className="overflow-y-auto p-3 space-y-2 flex-1 min-h-0">
                        {cart.map(item => (
                            <div key={item.menu_item_id} className="flex justify-between items-center bg-gray-50 border border-gray-200 p-2.5 rounded-lg">
                                <div className="flex-1 min-w-0 pr-2">
                                    <h5 className="font-bold text-xs text-[#241B15] truncate">{item.name}</h5>
                                    <p className="font-black text-xs text-[#C9974A]">₹{item.price * item.qty}</p>
                                </div>
                                <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
                                    <button type="button" onClick={() => updateQty(item.menu_item_id, -1)} className="w-7 h-7 flex items-center justify-center text-[#4E1414] active:bg-gray-100 rounded">-</button>
                                    <span className="text-xs font-bold w-4 text-center">{item.qty}</span>
                                    <button type="button" onClick={() => updateQty(item.menu_item_id, 1)} className="w-7 h-7 flex items-center justify-center text-[#4E1414] active:bg-gray-100 rounded">+</button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-4 text-center text-xs font-bold text-gray-400">Cart is empty. Add items from above.</div>
                )}

                <div className="p-4 border-t border-[#C9974A]/10 bg-white">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                        {!initialTableNo && (
                            <input required type="number" min="1" value={tableNo} onChange={e => setTableNo(e.target.value)} placeholder="Table No." className="w-full bg-gray-50 border border-[#C9974A]/30 rounded-lg px-4 py-2.5 text-sm font-bold text-center focus:border-[#4E1414] focus:outline-none" />
                        )}
                        <button type="submit" disabled={submitting || cart.length === 0 || !tableNo} className="w-full bg-[#4E1414] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl flex justify-between items-center px-6 shadow-md active:scale-95 transition-transform">
                            <span>{submitting ? 'Sending...' : 'Confirm & Send'}</span>
                            <span className="text-[#C9974A]">₹{total}</span>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

// ----------------------------------------------------------------------
// PRESERVED WAITER SETTINGS
// ----------------------------------------------------------------------
function WaiterSettings({ activeUser }: { activeUser: any }) {
    const [pwd, setPwd] = useState('');
    const [loading, setLoading] = useState(false);
    return (
        <div className="bg-white rounded-2xl shadow-xl border border-[#C9974A]/20 p-6 space-y-6">
            <div>
                <h2 className="font-display font-bold text-[#350C0C] text-xl mb-1">My Profile</h2>
                <p className="text-sm font-semibold text-[#C9974A]">{activeUser.name} — {activeUser.role.toUpperCase()}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                <h3 className="font-bold text-red-900 text-sm mb-2">Change PIN</h3>
                <div className="flex gap-2">
                    <input type="password" placeholder="New PIN" value={pwd} onChange={e => setPwd(e.target.value)} maxLength={6} className="flex-1 px-3 py-2 border border-red-200 rounded-lg text-sm focus:outline-none" />
                    <button onClick={async () => {
                        if (pwd.length < 4) return alert('PIN too short');
                        setLoading(true);
                        const r = await resetStaffPassword(activeUser.id, pwd);
                        setLoading(false);
                        if (r.success) { alert('PIN Updated'); setPwd(''); } else alert(r.error);
                    }} disabled={loading} className="bg-red-600 text-white font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-50">Save</button>
                </div>
            </div>
            <button onClick={async () => await logoutStaff()} className="w-full border-2 border-[#4E1414] text-[#4E1414] font-bold py-3 rounded-xl">Sign Out</button>
        </div>
    );
}
