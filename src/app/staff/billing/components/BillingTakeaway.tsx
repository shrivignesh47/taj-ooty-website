"use client";

import { ClipboardList, IndianRupee } from 'lucide-react';
import { orderTotal, fmt } from './utils';

interface Props {
    takeawayOrders: any[];
    setView: (view: 'bento' | 'tables' | 'takeaway' | 'history' | 'reports') => void;
    handleSelectTable: (dummyTable: any) => void;
}

export function BillingTakeaway({
    takeawayOrders,
    setView,
    handleSelectTable
}: Props) {
    return (
        <div className="space-y-6">
            <div className="bg-white border border-[#C9974A]/30 p-5 rounded-2xl shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-[#C9974A]" /> Takeaway & Counter Queue
                    </h2>
                    <button onClick={() => setView('bento')} className="text-xs text-[#C9974A] hover:underline font-bold">← Dashboard</button>
                </div>
                <p className="text-xs text-[#4E1414]/60">Settle counter pickups that aren't tied to dining tables.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {takeawayOrders.map(order => {
                        const total = orderTotal(order);
                        return (
                            <div key={order.id} className="bg-[#F6EEDF]/30 border border-[#C9974A]/25 rounded-xl p-4 flex flex-col justify-between space-y-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="font-black text-sm text-[#4E1414]">Takeaway: {order.customer_name}</span>
                                        {order.customer_phone && <p className="text-[10px] text-[#4E1414]/60">{order.customer_phone}</p>}
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
                                    className="w-full bg-[#4E1414] hover:bg-[#3b0e0e] text-[#F6EEDF] font-bold text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-1"
                                >
                                    <IndianRupee className="w-3.5 h-3.5" /> Settle Bill
                                </button>
                            </div>
                        );
                    })}
                    {takeawayOrders.length === 0 && (
                        <div className="col-span-full border border-dashed border-[#C9974A]/40 rounded-xl p-8 text-center text-[#4E1414]/40 font-semibold italic">
                            No active counter takeaway orders.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
