"use client";

import { Globe, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { fmt } from './utils';
import { CashierOrder } from '../types';

interface RestaurantSettings {
    swiggy_enabled?: boolean;
    zomato_enabled?: boolean;
    swiggy_merchant_id?: string;
    zomato_merchant_id?: string;
    [key: string]: unknown;
}

interface ActionResult {
    success: boolean;
    error?: string;
}

interface Props {
    onlineOrders: CashierOrder[];
    restaurantSettings: RestaurantSettings | null;
    toggleAggregator: (brand: 'swiggy' | 'zomato') => void;
    advanceOrderStatus: (orderId: string, status: string) => Promise<ActionResult>;
    simulateOnlineOrder: (source: 'swiggy' | 'zomato') => Promise<ActionResult>;
    loadData: () => Promise<void>;
}

export function AggregatorGatesCard({
    onlineOrders,
    restaurantSettings,
    toggleAggregator,
    advanceOrderStatus,
    simulateOnlineOrder,
    loadData
}: Props) {
    const swiggyActive = !!restaurantSettings?.swiggy_enabled;
    const zomatoActive = !!restaurantSettings?.zomato_enabled;
    const activeAggregatorOrders = onlineOrders.filter((o) => ['pending', 'confirmed'].includes(o.status));

    return (
        <div className="bg-white border border-[#C9974A]/30 rounded-3xl p-5 shadow-sm space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-[#C9974A]/25">
                <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#C9974A] animate-spin" style={{ animationDuration: '6s' }} />
                    <div>
                        <h4 className="font-bold text-xs text-[#4E1414]">Aggregator Gates</h4>
                        <p className="text-[9px] text-gray-400">Live order sync alerts</p>
                    </div>
                </div>

                {/* Brand toggles */}
                <div className="flex gap-2">
                    <button
                        onClick={() => toggleAggregator('swiggy')}
                        className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer border
                            ${swiggyActive
                                ? 'bg-[#FC8019]/10 border-[#FC8019] text-[#FC8019]'
                                : 'bg-gray-50 border-gray-200 text-gray-400'}`}
                    >
                        <span className={`w-1.5 h-1.5 rounded-full ${swiggyActive ? 'bg-[#FC8019] animate-ping' : 'bg-gray-300'}`} />
                        Swiggy
                    </button>
                    <button
                        onClick={() => toggleAggregator('zomato')}
                        className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer border
                            ${zomatoActive
                                ? 'bg-[#E23744]/10 border-[#E23744] text-[#E23744]'
                                : 'bg-gray-50 border-gray-200 text-gray-400'}`}
                    >
                        <span className={`w-1.5 h-1.5 rounded-full ${zomatoActive ? 'bg-[#E23744] animate-ping' : 'bg-gray-300'}`} />
                        Zomato
                    </button>
                </div>
            </div>

            {/* Content area: Active orders OR Brand connection status placeholder */}
            <div className="space-y-3 max-h-[300px] overflow-y-auto taj-scrollbar-dark pr-1">
                {activeAggregatorOrders.map((order) => {
                    const orderTotalAmt = order.order_items.reduce((acc: number, i) => acc + (i.price_at_order * i.qty), 0);
                    const brandColor = order.source === 'swiggy' ? '#FC8019' : '#E23744';
                    const brandLetter = order.source === 'swiggy' ? 'S' : 'Z';
                    const isPending = order.status === 'pending';

                    return (
                        <div key={order.id} className="bg-gray-50 border border-gray-100 rounded-2xl p-3 space-y-2.5">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                    <span
                                        style={{ backgroundColor: brandColor }}
                                        className="w-6 h-6 rounded-lg text-white font-black text-xs flex items-center justify-center shadow"
                                    >
                                        {brandLetter}
                                    </span>
                                    <div>
                                        <span className="font-extrabold text-xs text-[#4E1414]">{order.customer_name}</span>
                                        <p className="text-[8px] text-gray-400">Total: {fmt(orderTotalAmt)}</p>
                                    </div>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${isPending ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-green-100 text-green-800'}`}>
                                    {order.status}
                                </span>
                            </div>

                            {/* Items list */}
                            <div className="text-[10px] text-gray-600 bg-white rounded-lg p-2 border border-gray-100">
                                {order.order_items.map((i, idx: number) => (
                                    <div key={idx} className="flex justify-between">
                                        <span>{i.menu_items?.name}</span>
                                        <span className="font-semibold">x{i.qty}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}

                {/* Empty State / Status Indicator (Never Blank!) */}
                {activeAggregatorOrders.length === 0 && (
                    <div className="text-center py-6 px-4 bg-[#F6EEDF]/30 border border-dashed border-[#C9974A]/30 rounded-2xl flex flex-col justify-center items-center gap-2">
                        {(!swiggyActive && !zomatoActive) ? (
                            <>
                                <AlertCircle className="w-6 h-6 text-amber-600 opacity-80" />
                                <p className="text-[11px] text-[#4E1414] font-bold">Aggregator sync is not yet connected.</p>
                                <p className="text-[9px] text-gray-500">Contact admin to enable Swiggy/Zomato order sync above.</p>
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-6 h-6 text-green-600 opacity-80" />
                                <p className="text-[11px] text-[#4E1414] font-bold">Aggregator Gateways Active</p>
                                <p className="text-[9px] text-gray-500">
                                    {swiggyActive ? 'Swiggy (Connected) ' : ''}
                                    {zomatoActive ? '· Zomato (Connected)' : ''}
                                </p>
                                <div className="flex gap-1.5 mt-1.5">
                                    <button
                                        disabled={!swiggyActive}
                                        onClick={async () => {
                                            const res = await simulateOnlineOrder('swiggy');
                                            if (!res.success) alert(res.error);
                                            else loadData();
                                        }}
                                        className="px-2.5 py-1 bg-white border border-gray-200 text-gray-600 hover:bg-[#FC8019]/10 hover:border-[#FC8019]/30 hover:text-[#FC8019] rounded-lg text-[8px] font-black uppercase transition-all disabled:opacity-40 cursor-pointer"
                                    >
                                        + Test Swiggy Order
                                    </button>
                                    <button
                                        disabled={!zomatoActive}
                                        onClick={async () => {
                                            const res = await simulateOnlineOrder('zomato');
                                            if (!res.success) alert(res.error);
                                            else loadData();
                                        }}
                                        className="px-2.5 py-1 bg-white border border-gray-200 text-gray-600 hover:bg-[#E23744]/10 hover:border-[#E23744]/30 hover:text-[#E23744] rounded-lg text-[8px] font-black uppercase transition-all disabled:opacity-40 cursor-pointer"
                                    >
                                        + Test Zomato Order
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
