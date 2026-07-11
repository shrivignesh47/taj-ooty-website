/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { LiveOrder } from '@/features/ordering/hooks/useLiveOrders';
import { acceptAndConfirmOrder, cancelOrder } from '@/features/ordering/actions/waiterActions';
import { fetchRestaurantSettings } from '@/features/ordering/actions/adminActions';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Loader2, Edit3, X, Trash2, Plus, Minus, Send, Search, Printer } from 'lucide-react';

export function IncomingOrders({ orders, activeUser, catalog, onRefresh }: { orders: LiveOrder[], activeUser: any, catalog: any, onRefresh?: () => void }) {
    if (orders.length === 0) {
        return (
            <div className="text-center opacity-50 py-10">
                <p className="text-lg font-bold">No incoming orders.</p>
                <p className="text-sm">New orders from customers will appear here.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <AnimatePresence>
                {orders.map(order => (
                    <IncomingOrderCard key={order.id} order={order} activeUser={activeUser} catalog={catalog} onRefresh={onRefresh} />
                ))}
            </AnimatePresence>
        </div>
    );
}

function IncomingOrderCard({ order, activeUser, catalog, onRefresh }: { order: LiveOrder, activeUser: any, catalog: any, onRefresh?: () => void }) {
    const [submitting, setSubmitting] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [cancelPrompt, setCancelPrompt] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 15000);
        return () => clearInterval(timer);
    }, []);

    const timeSince = Math.floor((now - new Date(order.created_at).getTime()) / 60000);
    const totalAmount = order.order_items?.reduce((acc: number, item: any) => acc + (item.qty * item.price_at_order), 0) || 0;

    const handleCancel = async () => {
        if (!cancelReason.trim()) return alert('Provide a reason for cancellation');
        setSubmitting(true);
        const res = await cancelOrder(order.id, activeUser.id, cancelReason);
        if (!res.success) {
            alert(res.error);
        } else if (onRefresh) {
            onRefresh();
        }
        setSubmitting(false);
        setCancelPrompt(false);
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl p-4 shadow-lg border border-[#C9974A]/20 relative overflow-hidden"
            >
                {timeSince > 5 && (
                    <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse" />
                )}

                <div className="flex justify-between items-start mb-3">
                    <div>
                        <h3 className="font-black text-xl text-[#241B15] leading-none">
                            Table {order.restaurant_tables?.table_no || '?'}
                        </h3>
                        <span className="text-[12px] font-bold text-[#4E1414]/70">{order.customer_name} • {order.customer_phone}</span>
                    </div>
                    <div className="text-right">
                        <div className="text-[12px] font-bold text-[#241B15]/60 flex items-center justify-end gap-1 mb-1">
                            <Clock className="w-3 h-3" />
                            {timeSince}m ago
                        </div>
                        <div className="font-black text-[#4E1414]">₹{totalAmount}</div>
                    </div>
                </div>

                <div className="bg-[#F6EEDF]/50 rounded-lg p-3 mb-4 max-h-[120px] overflow-y-auto text-sm border border-[#C9974A]/10">
                    <ul className="space-y-1">
                        {order.order_items?.map((item: any, idx: number) => (
                            <li key={idx} className="flex justify-between font-semibold text-[#241B15]">
                                <span><b className="mr-1.5 text-[#4E1414]">{item.qty}x</b>{item.menu_items?.name}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {cancelPrompt ? (
                    <div className="flex flex-col gap-2">
                        <input 
                            type="text" 
                            placeholder="Reason for cancellation..." 
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            className="w-full text-sm p-2 border border-red-200 rounded-lg focus:ring-1 focus:ring-red-500"
                        />
                        <div className="flex gap-2">
                            <button onClick={handleCancel} disabled={submitting} className="flex-1 bg-red-600 text-white font-bold py-2 rounded-lg text-sm disabled:opacity-50 flex items-center justify-center gap-1">
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Cancel'}
                            </button>
                            <button onClick={() => setCancelPrompt(false)} className="flex-1 bg-gray-200 text-gray-700 font-bold py-2 rounded-lg text-sm">
                                Back
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <button
                            onClick={() => setDrawerOpen(true)}
                            className="flex-1 bg-[#4E1414] text-[#F6EEDF] font-bold py-2.5 rounded-xl flex justify-center items-center gap-2 transform active:scale-95 transition-all text-sm shadow-md"
                        >
                            <Edit3 className="w-4 h-4" />
                            View & Confirm
                        </button>
                        <button
                            onClick={() => setCancelPrompt(true)}
                            className="px-4 bg-red-50 text-red-600 font-bold py-2.5 rounded-xl flex justify-center items-center transform active:scale-95 transition-all shadow-sm"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </motion.div>

            {/* Review & Confirm Drawer */}
            <AnimatePresence>
                {drawerOpen && (
                    <ReviewDrawer 
                        order={order} 
                        activeUser={activeUser} 
                        catalog={catalog}
                        onClose={() => setDrawerOpen(false)} 
                        onRefresh={onRefresh}
                    />
                )}
            </AnimatePresence>
        </>
    );
}

function ReviewDrawer({ order, activeUser, catalog, onClose, onRefresh }: { order: LiveOrder, activeUser: any, catalog: any, onClose: () => void, onRefresh?: () => void }) {
    const hasEditPerm = activeUser.roleName?.toLowerCase() === 'admin' || activeUser.permissions?.includes('edit_orders');
    // Local state for editable items
    const [items, setItems] = useState<{ menu_item_id: string, name: string, qty: number, price: number }[]>(
        order.order_items?.map((i: any) => ({
            menu_item_id: i.menu_item_id,
            name: i.menu_items?.name,
            qty: i.qty,
            price: i.price_at_order
        })) || []
    );
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [settings, setSettings] = useState<any>(null);
    const printRef = useRef<HTMLDivElement>(null);

    // Fetch restaurant settings
    useEffect(() => {
        const fetchSettings = async () => {
            const result = await fetchRestaurantSettings();
            if (result.success) {
                setSettings(result.data);
            }
        };
        fetchSettings();
    }, []);

    // Function to generate print HTML and trigger print
    const handlePrint = (orderData: LiveOrder, finalItems: typeof items) => {
        if (!settings?.print_kot) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const total = finalItems.reduce((sum, i) => sum + i.qty * i.price, 0);

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>KOT - Table ${orderData.restaurant_tables?.table_no || '?'}</title>
                <style>
                    body {
                        font-family: monospace;
                        font-size: 14px;
                        padding: 10px;
                        max-width: 300px;
                        margin: 0 auto;
                    }
                    .header { text-align: center; margin-bottom: 15px; }
                    .item { display: flex; justify-content: space-between; margin: 5px 0; }
                    .total { margin-top: 15px; font-weight: bold; text-align: right; }
                    .divider { border-top: 1px dashed #000; margin: 10px 0; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h3 style="margin: 0;">${settings?.restaurant_name || 'Restaurant'}</h3>
                    <p style="margin: 2px 0; font-size: 12px;">${settings?.address || ''}</p>
                    <div class="divider"></div>
                </div>
                <div>
                    <p><strong>Table:</strong> ${orderData.restaurant_tables?.table_no || '?'}</p>
                    <p><strong>Customer:</strong> ${orderData.customer_name || ''}</p>
                    <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                </div>
                <div class="divider"></div>
                <div>
                    ${finalItems.map(i => `
                        <div class="item">
                            <span>${i.qty}x ${i.name}</span>
                            <span>₹${i.price * i.qty}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="divider"></div>
                <div class="total">Total: ₹${total}</div>
            </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.focus();
        // Wait for content to load before printing
        setTimeout(() => {
            printWindow.print();
            // Optionally close after print
            // printWindow.close();
        }, 250);
    };

    const updateQty = (idx: number, delta: number) => {
        const newItems = [...items];
        newItems[idx].qty += delta;
        if (newItems[idx].qty <= 0) {
            newItems.splice(idx, 1);
        }
        setItems(newItems);
    };

    const handleConfirm = async () => {
        if (items.length === 0) return alert('Cannot confirm an empty order. Reject it instead.');
        setSubmitting(true);
        const res = await acceptAndConfirmOrder(order.id, activeUser.id, order.restaurant_tables?.table_no, items);
        if (res.success) {
            if (settings?.auto_print_on_accept) {
                handlePrint(order, items);
            }
            if (onRefresh) {
                onRefresh();
            }
            onClose();
        } else {
            alert(res.error);
        }
        setSubmitting(false);
    };

    const total = items.reduce((acc, i) => acc + (i.qty * i.price), 0);

    return (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <motion.div 
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative bg-[#F6EEDF] w-full max-w-md mx-auto rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
            >
                <div className="p-5 border-b border-[#C9974A]/20 flex justify-between items-center bg-white">
                    <h2 className="text-xl font-display font-bold text-[#4E1414]">Review Order</h2>
                    <button onClick={onClose} className="p-2 bg-[#F6EEDF] rounded-full text-[#4E1414]"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-5 flex-1 overflow-y-auto space-y-4">
                    {items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-[#C9974A]/10">
                            <div className="flex-1 pr-2">
                                <h4 className="font-semibold text-sm text-[#241B15]">{item.name}</h4>
                                <p className="text-xs text-[#C9974A] font-bold">₹{item.price}</p>
                            </div>
                            {hasEditPerm ? (
                                <div className="flex items-center gap-3 bg-[#F6EEDF] border border-[#C9974A]/20 rounded-lg p-1 shadow-inner">
                                    <button onClick={() => updateQty(idx, -1)} className="p-1.5 text-[#4E1414] active:bg-black/5 rounded"><Minus className="w-3 h-3" /></button>
                                    <span className="text-sm font-bold text-[#4E1414] w-4 text-center">{item.qty}</span>
                                    <button onClick={() => updateQty(idx, 1)} className="p-1.5 text-[#4E1414] active:bg-black/5 rounded"><Plus className="w-3 h-3" /></button>
                                </div>
                            ) : (
                                <div className="bg-[#F6EEDF] border border-[#C9974A]/20 rounded-lg px-3 py-1.5 shadow-inner">
                                    <span className="text-sm font-black text-[#4E1414]">{item.qty} Qty</span>
                                </div>
                            )}
                        </div>
                    ))}
                    {items.length === 0 && <p className="text-center text-red-500 font-bold py-4">Order is empty!</p>}
                    
                    <div className="flex justify-between items-center mb-6 bg-white p-3 rounded-xl border border-[#C9974A]/20 shadow-sm">
                        <div className="font-bold text-[#350C0C]">
                            Total: <span className="text-[#C9974A] ml-2 text-xl font-display">₹{total}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => handlePrint(order, items)}
                                disabled={!settings?.print_kot}
                                className="border border-[#4E1414]/20 bg-[#F6EEDF] text-[#4E1414] px-4 py-3 rounded-xl font-bold flex items-center gap-2 disabled:opacity-40"
                            >
                                <Printer className="w-4 h-4" />
                                Print KOT
                            </button>
                            <button 
                                onClick={handleConfirm}
                                disabled={submitting || items.length === 0}
                                className="bg-[#4E1414] disabled:opacity-50 text-[#F6EEDF] px-6 py-3 rounded-xl font-bold flex items-center gap-2 active:scale-95 transition-transform"
                            >
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                Send to Kitchen
                            </button>
                        </div>
                    </div>

                    {/* Add New Items Section */}
                    {hasEditPerm && (
                        <div className="border-t border-[#C9974A]/20 pt-4 mt-2">
                            <p className="text-xs font-bold uppercase tracking-wider text-[#4E1414] mb-3 opacity-80">Add Item to Order</p>
                            
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-4 w-4 text-[#C9974A]" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search menu items..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-white border border-[#C9974A]/30 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#241B15] font-semibold focus:outline-none focus:ring-2 focus:ring-[#C9974A]/50 focus:border-[#4E1414] transition-all shadow-sm mb-3"
                                />
                            </div>

                            <div className="bg-white border border-[#C9974A]/20 rounded-xl overflow-hidden shadow-inner max-h-[35vh] overflow-y-auto">
                                {catalog?.categories.map((cat: any) => {
                                    const catItems = catalog.menuItems.filter((m: any) => 
                                        m.category_id === cat.id && 
                                        m.name.toLowerCase().includes(searchQuery.toLowerCase())
                                    );
                                    
                                    if (catItems.length === 0) return null;

                                    return (
                                        <div key={cat.id}>
                                            <div className="bg-[#F6EEDF] px-3 py-1.5 sticky top-0 z-10 border-b border-t first:border-t-0 border-[#C9974A]/20">
                                                <span className="text-[10px] font-black uppercase text-[#4E1414] tracking-wider">{cat.name}</span>
                                            </div>
                                            <div className="divide-y divide-[#C9974A]/10">
                                                {catItems.map((m: any) => (
                                                    <div key={m.id} className="flex justify-between items-center p-3 hover:bg-gray-50 transition-colors">
                                                        <div>
                                                            <h5 className="text-sm font-bold text-[#241B15]">{m.name}</h5>
                                                            <p className="text-xs font-bold text-[#C9974A]">₹{m.price}</p>
                                                        </div>
                                                        <button 
                                                            onClick={() => {
                                                                const existsIdx = items.findIndex(i => i.menu_item_id === m.id);
                                                                if (existsIdx >= 0) {
                                                                    updateQty(existsIdx, 1);
                                                                } else {
                                                                    setItems([...items, {
                                                                        menu_item_id: m.id,
                                                                        name: m.name,
                                                                        price: Number(m.price),
                                                                        qty: 1
                                                                    }]);
                                                                }
                                                                setSearchQuery(''); // Optional: clear search on add
                                                            }}
                                                            className="bg-[#F6EEDF] text-[#4E1414] w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#4E1414] hover:text-white transition-colors border border-[#C9974A]/30 shadow-sm active:scale-95"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                                
                                {catalog?.menuItems.filter((m: any) => m.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                                    <div className="p-6 text-center text-[#241B15]/50 text-sm font-semibold">
                                        No items found matching &quot;{searchQuery}&quot;
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
