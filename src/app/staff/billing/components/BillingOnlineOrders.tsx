"use client";

import { useState, useEffect } from 'react';
import { ClipboardList, ChefHat, Play, CheckCircle2, AlertCircle, ShoppingBag } from 'lucide-react';
import { orderTotal, fmt } from './utils';
import { CashierOrder } from '../types';
import { advanceOrderStatus } from '@/features/ordering/actions/updateOrderStatus';
import { simulateOnlineOrder, fetchRestaurantSettings } from '@/features/ordering/actions/adminActions';

interface Props {
    onlineOrders: CashierOrder[];
    setView: (view: any) => void;
    loadData: () => Promise<void>;
}

export function BillingOnlineOrders({
    onlineOrders,
    setView,
    loadData
}: Props) {
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [settings, setSettings] = useState({
        swiggy_enabled: false,
        zomato_enabled: false,
        swiggy_merchant_id: '',
        zomato_merchant_id: ''
    });
    const [loadingSettings, setLoadingSettings] = useState(true);

    useEffect(() => {
        fetchRestaurantSettings().then(res => {
            if (res.success && res.data) {
                setSettings({
                    swiggy_enabled: !!res.data.swiggy_enabled,
                    zomato_enabled: !!res.data.zomato_enabled,
                    swiggy_merchant_id: res.data.swiggy_merchant_id || '',
                    zomato_merchant_id: res.data.zomato_merchant_id || ''
                });
            }
            setLoadingSettings(false);
        });
    }, []);

    const handleAccept = async (orderId: string) => {
        setActionLoading(orderId);
        const res = await advanceOrderStatus(orderId, 'confirmed');
        if ('error' in res) {
            alert(`Failed to accept order: ${res.error}`);
        } else {
            await loadData();
        }
        setActionLoading(null);
    };

    const handleMoveToKitchen = async (orderId: string) => {
        setActionLoading(orderId);
        const res = await advanceOrderStatus(orderId, 'preparing');
        if ('error' in res) {
            alert(`Failed to move order to kitchen: ${res.error}`);
        } else {
            await loadData();
        }
        setActionLoading(null);
    };

    const handleSimulate = async (type: 'swiggy' | 'zomato') => {
        setActionLoading(type);
        const res = await simulateOnlineOrder(type);
        if (!res.success) {
            alert(`Simulation failed: ${res.error}`);
        } else {
            await loadData();
        }
        setActionLoading(null);
    };

    const swiggyOrders = onlineOrders.filter(o => o.source === 'swiggy');
    const zomatoOrders = onlineOrders.filter(o => o.source === 'zomato');

    return (
        <div className="space-y-6">
            {/* Simulation Header Tools */}
            <div className="bg-white border border-[#C9974A]/30 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="font-black text-lg flex items-center gap-2 text-[#4E1414]">
                        <ShoppingBag className="w-5 h-5 text-[#C9974A]" /> Online Delivery Dashboard
                    </h2>
                    <p className="text-xs text-[#4E1414]/60 mt-1">Accept aggregator orders and dispatch KOTs manually to kitchen stations.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        disabled={actionLoading !== null || (!loadingSettings && !settings.swiggy_enabled)}
                        onClick={() => handleSimulate('swiggy')}
                        className="bg-[#FC8019] hover:bg-[#e47213] disabled:opacity-40 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                        {actionLoading === 'swiggy' ? 'Injecting...' : 'Simulate Swiggy Order'}
                    </button>
                    <button
                        disabled={actionLoading !== null || (!loadingSettings && !settings.zomato_enabled)}
                        onClick={() => handleSimulate('zomato')}
                        className="bg-[#E23744] hover:bg-[#c92f3b] disabled:opacity-40 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                        {actionLoading === 'zomato' ? 'Injecting...' : 'Simulate Zomato Order'}
                    </button>
                    <button onClick={() => setView('bento')} className="text-xs text-[#C9974A] hover:underline font-bold self-center ml-2">← Back</button>
                </div>
            </div>

            {/* Integrations Warning Alerts */}
            {!loadingSettings && !settings.swiggy_enabled && !settings.zomato_enabled && (
                <div className="bg-[#4E1414]/5 border-2 border-dashed border-[#4E1414]/20 p-6 rounded-2xl text-center space-y-2">
                    <AlertCircle className="w-8 h-8 text-[#C9974A] mx-auto" />
                    <h4 className="font-bold text-sm text-[#4E1414]">Aggregator Integrations Suspended</h4>
                    <p className="text-xs text-[#4E1414]/60 max-w-md mx-auto">
                        Both Swiggy & Zomato sync gates are turned off in Admin settings. Enable integrations under Admin Dashboard &gt; Settings to allow incoming merchant order logs.
                    </p>
                </div>
            )}

            {/* Main Orders Display Queue */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Swiggy Lane */}
                <div className="bg-white border border-[#FC8019]/20 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b border-[#FC8019]/10 pb-3">
                        <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-[#FC8019] text-white font-black text-sm flex items-center justify-center">S</span>
                            <div>
                                <h3 className="font-extrabold text-[#FC8019] text-sm">Swiggy Live Queue</h3>
                                <p className="text-[10px] text-[#4E1414]/50">Merchant ID: {settings.swiggy_merchant_id || 'Disabled'}</p>
                            </div>
                        </div>
                        <span className="bg-[#FC8019]/10 text-[#FC8019] text-[10px] font-black px-2.5 py-1 rounded-full">
                            {swiggyOrders.length} orders
                        </span>
                    </div>

                    <div className="space-y-4 max-h-[500px] overflow-y-auto taj-scrollbar-dark pr-1">
                        {swiggyOrders.map(order => (
                            <OrderCard 
                                key={order.id}
                                order={order}
                                actionLoading={actionLoading}
                                handleAccept={handleAccept}
                                handleMoveToKitchen={handleMoveToKitchen}
                            />
                        ))}
                        {swiggyOrders.length === 0 && (
                            <div className="text-center py-16 text-gray-400 text-xs italic font-semibold border border-dashed border-gray-100 rounded-xl">
                                No active Swiggy orders.
                            </div>
                        )}
                    </div>
                </div>

                {/* Zomato Lane */}
                <div className="bg-white border border-[#E23744]/20 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b border-[#E23744]/10 pb-3">
                        <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-[#E23744] text-white font-black text-sm flex items-center justify-center">Z</span>
                            <div>
                                <h3 className="font-extrabold text-[#E23744] text-sm">Zomato Live Queue</h3>
                                <p className="text-[10px] text-[#4E1414]/50">Merchant ID: {settings.zomato_merchant_id || 'Disabled'}</p>
                            </div>
                        </div>
                        <span className="bg-[#E23744]/10 text-[#E23744] text-[10px] font-black px-2.5 py-1 rounded-full">
                            {zomatoOrders.length} orders
                        </span>
                    </div>

                    <div className="space-y-4 max-h-[500px] overflow-y-auto taj-scrollbar-dark pr-1">
                        {zomatoOrders.map(order => (
                            <OrderCard 
                                key={order.id}
                                order={order}
                                actionLoading={actionLoading}
                                handleAccept={handleAccept}
                                handleMoveToKitchen={handleMoveToKitchen}
                            />
                        ))}
                        {zomatoOrders.length === 0 && (
                            <div className="text-center py-16 text-gray-400 text-xs italic font-semibold border border-dashed border-gray-100 rounded-xl">
                                No active Zomato orders.
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}

function OrderCard({
    order,
    actionLoading,
    handleAccept,
    handleMoveToKitchen
}: {
    order: CashierOrder;
    actionLoading: string | null;
    handleAccept: (id: string) => Promise<void>;
    handleMoveToKitchen: (id: string) => Promise<void>;
}) {
    const total = orderTotal(order);
    const brandColor = order.source === 'swiggy' ? '#FC8019' : '#E23744';

    return (
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col justify-between space-y-3.5 shadow-xs">
            <div className="flex justify-between items-start">
                <div>
                    <span className="font-extrabold text-sm text-[#4E1414]">{order.customer_name}</span>
                    <p className="text-[9px] text-[#4E1414]/40 mt-0.5">Received: {new Date(order.created_at).toLocaleTimeString()}</p>
                </div>
                <div className="text-right">
                    <span className="font-black text-sm text-[#C9974A]">{fmt(total)}</span>
                    <div className="mt-1">
                        {order.status === 'pending' && (
                            <span className="inline-block bg-amber-500/10 text-amber-600 text-[8px] font-black px-2 py-0.5 rounded uppercase">
                                Aggregator Pending
                            </span>
                        )}
                        {order.status === 'confirmed' && (
                            <span className="inline-block bg-green-500/10 text-green-600 text-[8px] font-black px-2 py-0.5 rounded uppercase">
                                Accepted
                            </span>
                        )}
                        {order.status === 'preparing' && (
                            <span className="inline-block bg-orange-500/10 text-orange-600 text-[8px] font-black px-2 py-0.5 rounded uppercase animate-pulse">
                                Preparing
                            </span>
                        )}
                        {order.status === 'ready' && (
                            <span className="inline-block bg-blue-500/10 text-blue-600 text-[8px] font-black px-2 py-0.5 rounded uppercase">
                                Ready
                            </span>
                        )}
                        {order.status === 'served' && (
                            <span className="inline-block bg-purple-500/10 text-purple-600 text-[8px] font-black px-2 py-0.5 rounded uppercase">
                                Dispatched
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Item list */}
            <div className="text-xs text-[#4E1414]/70 bg-white border border-gray-100 rounded-lg p-2.5 max-h-24 overflow-y-auto space-y-1">
                {order.order_items.map((i, idx) => (
                    <div key={idx} className="flex justify-between font-bold">
                        <span>{i.menu_items?.name}</span>
                        <span className="text-[#4E1414]/50">x{i.qty}</span>
                    </div>
                ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
                {order.status === 'pending' && (
                    <button
                        disabled={actionLoading !== null}
                        onClick={() => handleAccept(order.id)}
                        style={{ backgroundColor: brandColor }}
                        className="flex-1 text-white font-extrabold text-xs py-2 rounded-lg hover:brightness-95 transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Accept Order
                    </button>
                )}

                {order.status === 'confirmed' && (
                    <button
                        disabled={actionLoading !== null}
                        onClick={() => handleMoveToKitchen(order.id)}
                        className="flex-1 bg-[#4E1414] hover:bg-[#3d0f0f] text-[#F6EEDF] font-extrabold text-xs py-2 rounded-lg transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                        <ChefHat className="w-3.5 h-3.5 text-[#C9974A]" /> Move to Kitchen
                    </button>
                )}

                {(order.status === 'preparing' || order.status === 'ready' || order.status === 'served') && (
                    <div className="w-full text-center bg-gray-100 text-gray-500 border border-gray-200 rounded-lg py-2 text-[10px] font-extrabold">
                        ✔ SENT TO KITCHEN QUEUE
                    </div>
                )}
            </div>
        </div>
    );
}
