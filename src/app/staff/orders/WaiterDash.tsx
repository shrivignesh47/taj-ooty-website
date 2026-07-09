"use client";

import { useLiveOrders, LiveOrder } from '@/features/ordering/hooks/useLiveOrders';
import { acceptOrder, pushToKitchen } from '@/features/ordering/actions/waiterActions';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckSquare, Loader2, Utensils, Hand, AlertTriangle, Plus, Search, User, LogOut } from 'lucide-react';
import { useState } from 'react';
import { resetStaffPassword } from '@/features/ordering/actions/staffActions';
import { logoutStaff } from '@/features/ordering/actions/auth';

export function WaiterDash({ activeUser }: { activeUser: any }) {
    // Waiters track 'pending', 'confirmed', 'preparing', 'ready'
    const { orders, loading } = useLiveOrders(['pending', 'confirmed', 'preparing', 'ready']);
    const [tab, setTab] = useState<'orders' | 'settings' | 'pos'>('orders');

    if (loading) {
        return <div className="text-[#C9974A] font-bold animate-pulse text-center py-20 mt-10">Loading Station...</div>;
    }

    // Orders without a waiter
    const unclaimed = orders.filter(o => o.status === 'pending' && !o.waiter_id);

    // Orders claimed by ME (or confirmed/on-going)
    const myOrders = orders.filter(o => o.waiter_id === activeUser.id);

    const staleUnclaimed = unclaimed.filter(o => (new Date().getTime() - new Date(o.created_at).getTime()) > 5 * 60 * 1000);

    return (
        <div className="max-w-md mx-auto relative pb-20">
            {tab === 'orders' && (
                <div className="space-y-6">
                    {/* Unclaimed Queue */}
                    <div className="bg-white rounded-2xl shadow-xl border border-[#C9974A]/20 p-4">
                        <h2 className="font-display font-bold text-[#350C0C] mb-4 flex justify-between items-center text-lg">
                            Needs Assignment
                            <div className="flex gap-2">
                                {staleUnclaimed.length > 0 && (
                                    <span className="bg-red-900 text-white px-2 py-0.5 rounded-full text-xs font-bold animate-pulse flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" /> {staleUnclaimed.length} Ignored
                                    </span>
                                )}
                                <span className="bg-red-600 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                                    {unclaimed.length} New
                                </span>
                            </div>
                        </h2>
                        <div className="flex flex-col gap-3 max-h-[40vh] overflow-y-auto pr-1 taj-scrollbar">
                            <AnimatePresence>
                                {unclaimed.map(order => (
                                    <OrderCard key={order.id} order={order} variant="unclaimed" activeUser={activeUser} />
                                ))}
                                {unclaimed.length === 0 && (
                                    <div className="text-center opacity-50 py-6 text-sm">No new orders waiting.</div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* My Active Tables */}
                    <div className="bg-white rounded-2xl shadow-xl border border-[#C9974A]/20 p-4">
                        <h2 className="font-display font-bold text-[#350C0C] mb-4 flex justify-between items-center text-lg">
                            My Active Tables
                            <span className="bg-[#4E1414] text-white px-2 py-0.5 rounded-full text-xs">
                                {myOrders.length}
                            </span>
                        </h2>
                        <div className="flex flex-col gap-3">
                            <AnimatePresence>
                                {myOrders.map(order => (
                                    <OrderCard key={order.id} order={order} variant="mine" activeUser={activeUser} />
                                ))}
                                {myOrders.length === 0 && (
                                    <div className="text-center opacity-50 py-6 text-sm">You have no active tables.</div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            )}

            {tab === 'pos' && (
                <WaiterPOS activeUser={activeUser} onClose={() => setTab('orders')} />
            )}

            {tab === 'settings' && (
                <WaiterSettings activeUser={activeUser} />
            )}

            {/* Bottom Nav for Mobile */}
            <div className="fixed bottom-0 left-0 right-0 bg-[#350C0C] text-[#F6EEDF] p-4 flex justify-around shadow-2xl z-50 rounded-t-3xl border-t border-[#C9974A]/40">
                <button onClick={() => setTab('orders')} className={`flex flex-col items-center gap-1 transition-colors ${tab === 'orders' ? 'text-[#C9974A]' : 'opacity-60 hover:opacity-100'}`}>
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

function OrderCard({ order, variant, activeUser }: { order: LiveOrder, variant: "unclaimed" | "mine", activeUser: any }) {
    const [submitting, setSubmitting] = useState(false);

    const handleAccept = async () => {
        setSubmitting(true);
        let tableNo = order.restaurant_tables?.table_no;
        if (!tableNo) {
            const res = prompt("Table number missing. Enter table number to claim this order:");
            if (res === null) { setSubmitting(false); return; }
            tableNo = parseInt(res);
            if (isNaN(tableNo)) { alert("Invalid table number"); setSubmitting(false); return; }
        }
        await acceptOrder(order.id, activeUser.id, tableNo);
        setSubmitting(false);
    };

    const handlePush = async () => {
        setSubmitting(true);
        await pushToKitchen(order.id);
        setSubmitting(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`border-2 p-4 rounded-xl shadow-sm ${variant === 'unclaimed' ? 'bg-red-50 border-red-200' : 'bg-[#F6EEDF] border-[#C9974A]/30'}`}
        >
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="font-black text-lg text-[#241B15] leading-none">
                        Table {order.restaurant_tables?.table_no || <span className="text-red-500 animate-pulse">?</span>}
                    </h3>
                    <span className="text-[11px] font-bold uppercase text-[#4E1414]/70">{order.customer_name}</span>
                </div>
                <div className="text-[10px] font-bold text-[#241B15]/60 flex items-center gap-1 bg-black/5 px-2 py-1 rounded-md">
                    <Clock className="w-3 h-3" />
                    {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>

            <ul className="text-xs space-y-1 mb-4 opacity-90 border-l-[3px] border-[#C9974A] pl-3 py-1">
                {order.order_items?.map((item: any, idx: number) => (
                    <li key={idx} className="font-semibold text-[#241B15]">
                        <b className="mr-1.5 text-[#4E1414]">{item.qty}x</b>{item.menu_items?.name}
                    </li>
                ))}
            </ul>

            {variant === 'unclaimed' && (
                <button
                    onClick={handleAccept}
                    disabled={submitting}
                    className="w-full bg-[#4E1414] text-white font-bold py-2.5 rounded-lg flex justify-center items-center gap-2 transform active:scale-95 transition-all disabled:opacity-50 text-sm shadow-md"
                >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Hand className="w-4 h-4" />}
                    Claim & Review Order
                </button>
            )}

            {variant === 'mine' && order.status === 'pending' && (
                <button
                    onClick={handlePush}
                    disabled={submitting}
                    className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-lg flex justify-center items-center gap-2 transform active:scale-95 transition-all text-sm shadow-md disabled:opacity-50"
                >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
                    Confirm & Push to Kitchen
                </button>
            )}

            {variant === 'mine' && order.status !== 'pending' && (
                <div className="w-full bg-black/5 text-[#241B15] font-bold py-2 text-center rounded-lg text-xs uppercase tracking-wider flex justify-center items-center gap-2">
                    {order.status === 'confirmed' ? '🍳 Queueing in Kitchen' :
                        order.status === 'preparing' ? '🔥 Cooking...' :
                            order.status === 'ready' ? '🛎️ Ready to Serve!' : order.status}
                </div>
            )}
        </motion.div>
    );
}

function WaiterSettings({ activeUser }: { activeUser: any }) {
    const [pwd, setPwd] = useState('');
    const [loading, setLoading] = useState(false);

    const handleUpdate = async () => {
        if (!pwd) return;
        setLoading(true);
        const res = await resetStaffPassword(activeUser.id, pwd);
        setLoading(false);
        if (res.success) {
            alert('Password updated successfully!');
            setPwd('');
        } else {
            alert('Error updating password.');
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-[#C9974A]/20 p-6">
            <h2 className="font-display font-bold text-[#350C0C] mb-6 text-xl text-center">My Profile</h2>

            <div className="bg-[#F6EEDF] rounded-xl p-4 mb-6 border border-[#C9974A]/30 text-center">
                <User className="w-12 h-12 text-[#4E1414] mx-auto mb-2 opacity-50" />
                <h3 className="font-black text-lg text-[#241B15]">{activeUser.name}</h3>
                <p className="text-xs font-bold text-[#4E1414] uppercase tracking-wider mt-1">{activeUser.roleName}</p>
            </div>

            <div className="space-y-4 mb-8">
                <div>
                    <label className="block text-xs font-bold text-[#4E1414] uppercase tracking-wider mb-2">Change Password</label>
                    <input
                        type="password"
                        value={pwd}
                        onChange={e => setPwd(e.target.value)}
                        placeholder="Enter new password"
                        className="w-full bg-[#F6EEDF]/50 border border-[#C9974A]/40 rounded-xl px-4 py-3 text-sm font-bold text-[#241B15] outline-none focus:border-[#4E1414]"
                    />
                </div>
                <button
                    onClick={handleUpdate}
                    disabled={!pwd || loading}
                    className="w-full bg-[#C9974A] disabled:opacity-50 text-[#350C0C] font-bold py-3 rounded-xl transition-all active:scale-95 shadow-md flex justify-center items-center gap-2"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password"}
                </button>
            </div>

            <button
                onClick={() => logoutStaff()}
                className="w-full flex items-center justify-center gap-2 text-red-600 font-bold bg-red-50 border border-red-200 py-3 rounded-xl active:scale-95 transition-all text-sm"
            >
                <LogOut className="w-4 h-4" /> End Shift (Sign Out)
            </button>
        </div>
    );
}
