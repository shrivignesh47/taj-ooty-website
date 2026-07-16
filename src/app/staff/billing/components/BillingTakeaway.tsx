"use client";

import { useState } from 'react';
import { ClipboardList, IndianRupee, Plus, ChefHat, Check } from 'lucide-react';
import { orderTotal, fmt } from './utils';
import { CashierOrder } from '../types';
import { BillingTakeawayCreator } from './BillingTakeawayCreator';

interface Props {
    takeawayOrders: CashierOrder[];
    setView: (view: any) => void;
    handleSelectTable: (dummyTable: any) => void;
    menuItemsList: any[];
    loadData: () => Promise<void>;
}

export function BillingTakeaway({
    takeawayOrders,
    setView,
    handleSelectTable,
    menuItemsList,
    loadData
}: Props) {
    const [showCreator, setShowCreator] = useState(false);

    return (
        <div className="space-y-6">
            {showCreator ? (
                <BillingTakeawayCreator
                    menuItems={menuItemsList}
                    takeawayOrdersCount={takeawayOrders.length}
                    onClose={() => setShowCreator(false)}
                    loadData={loadData}
                    handleSelectTable={handleSelectTable}
                />
            ) : (
                <div className="bg-white border border-[#C9974A]/30 p-5 rounded-2xl shadow-sm space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <ClipboardList className="w-5 h-5 text-[#C9974A]" />
                            <h2 className="font-bold text-lg text-[#4E1414]">
                                Takeaway & Counter Queue
                            </h2>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowCreator(true)}
                                className="bg-[#4E1414] hover:bg-[#3d0f0f] text-[#F6EEDF] font-bold text-xs px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            >
                                <Plus className="w-4 h-4 text-[#C9974A]" /> Create Takeaway Order
                            </button>
                            <button onClick={() => setView('bento')} className="text-xs text-[#C9974A] hover:underline font-bold">← Dashboard</button>
                        </div>
                    </div>
                    <p className="text-xs text-[#4E1414]/60">Settle counter pickups that aren't tied to dining tables.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {takeawayOrders.map(order => {
                            const total = orderTotal(order);
                            return (
                                <div key={order.id} className="bg-[#F6EEDF]/30 border border-[#C9974A]/25 rounded-xl p-4 flex flex-col justify-between space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="font-black text-sm text-[#4E1414]">Takeaway: {order.customer_name}</span>
                                                {order.token_no && (
                                                    <span className="bg-[#4E1414] text-[#F6EEDF] text-[9px] font-black px-2 py-0.5 rounded">
                                                        {order.token_no}
                                                    </span>
                                                )}
                                            </div>
                                            {order.customer_phone && <p className="text-[10px] text-[#4E1414]/60 mt-0.5">{order.customer_phone}</p>}
                                        </div>
                                        <span className="font-black text-[#C9974A]">{fmt(total)}</span>
                                    </div>
                                    
                                    <div className="text-xs text-[#4E1414]/60 max-h-16 overflow-y-auto">
                                        {order.order_items.map((i, idx) => (
                                            <div key={idx} className="flex justify-between">
                                                <span>{i.menu_items?.name}</span>
                                                <span>x{i.qty}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Order Status Display Badge */}
                                    <div className="flex justify-between items-center text-[10px] font-bold">
                                        <span className="text-[#4E1414]/60">Status:</span>
                                        {order.status === 'preparing' && (
                                            <span className="text-orange-600 animate-pulse uppercase tracking-wider text-[9px]">Preparing in Kitchen</span>
                                        )}
                                        {order.status === 'ready' && (
                                            <span className="text-blue-600 uppercase tracking-wider text-[9px]">Food Ready for Pickup</span>
                                        )}
                                        {order.status === 'served' && (
                                            <span className="text-green-600 uppercase tracking-wider text-[9px]">Dispatched / Serviced</span>
                                        )}
                                        {order.status === 'confirmed' && (
                                            <span className="text-gray-500 uppercase tracking-wider text-[9px]">Confirmed Awaiting KOT</span>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => handleSelectTable({
                                            id: order.id,
                                            table_no: 0,
                                            status: 'Awaiting Settlement',
                                            currentBill: total,
                                            customer_name: order.customer_name,
                                            customer_phone: order.customer_phone ?? undefined,
                                            orders: [order],
                                            latestStatus: order.status
                                        })}
                                        className="w-full bg-[#4E1414] hover:bg-[#3b0e0e] text-[#F6EEDF] font-bold text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                    >
                                        <IndianRupee className="w-3.5 h-3.5" /> Settle Bill
                                    </button>
                                </div>
                            );
                        })}
                        {takeawayOrders.length === 0 && (
                            <div className="col-span-full border border-dashed border-[#C9974A]/40 rounded-xl p-8 text-center text-[#4E1414]/40 font-semibold italic">
                                No active counter takeaway orders. Click "Create Takeaway Order" to build a new one.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
