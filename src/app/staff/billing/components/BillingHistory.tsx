"use client";

import { History } from 'lucide-react';
import { orderTotal, fmt } from './utils';

interface Props {
    history: any[];
    setView: (view: 'bento' | 'tables' | 'takeaway' | 'history' | 'reports') => void;
}

export function BillingHistory({
    history,
    setView
}: Props) {
    return (
        <div className="bg-white border border-[#C9974A]/30 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        <History className="w-5 h-5 text-[#C9974A]" /> Closed Bills Registry
                    </h2>
                    <p className="text-xs text-[#4E1414]/60">Shift payments registry archive.</p>
                </div>
                <button onClick={() => setView('bento')} className="text-xs text-[#C9974A] hover:underline font-bold">← Dashboard</button>
            </div>

            {/* Bills Table Grid */}
            <div className="overflow-x-auto rounded-xl border border-[#C9974A]/25">
                <table className="w-full text-xs text-left">
                    <thead className="bg-[#4E1414] text-[#F6EEDF] uppercase font-bold tracking-wider">
                        <tr>
                            <th className="p-3">Table/POS</th>
                            <th className="p-3">Guest Profile</th>
                            <th className="p-3">Summary of Items</th>
                            <th className="p-3">Time Billed</th>
                            <th className="p-3 text-right">Settled Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#C9974A]/20 bg-white">
                        {history.map(o => {
                            const sub = orderTotal(o);
                            const grand = sub * 1.15;
                            return (
                                <tr key={o.id} className="hover:bg-[#F6EEDF]/30 transition-colors">
                                    <td className="p-3 font-bold text-[#4E1414]">{o.restaurant_tables ? `Table ${o.restaurant_tables.table_no}` : 'Counter'}</td>
                                    <td className="p-3">
                                        <p className="font-semibold">{o.customer_name}</p>
                                        {o.customer_phone && <p className="text-[10px] text-[#4E1414]/60">{o.customer_phone}</p>}
                                    </td>
                                    <td className="p-3 text-[#4E1414]/60 max-w-xs truncate">
                                        {o.order_items.map(i => `${i.menu_items?.name} x${i.qty}`).join(', ')}
                                    </td>
                                    <td className="p-3 text-[#4E1414]/40">{new Date(o.created_at).toLocaleTimeString()}</td>
                                    <td className="p-3 text-right font-black">{fmt(grand)}</td>
                                </tr>
                            );
                        })}
                        {history.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-[#4E1414]/40 italic">
                                    No closed bills in the history log yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
