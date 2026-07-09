/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from 'react';
import { Search, X, User } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
    customers: any[];
    orders: any[];
}

export function AdminCRM({ customers, orders }: Props) {
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<any | null>(null);

    const filtered = customers.filter(c =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search)
    );

    const customerOrders = selected
        ? orders.filter(o => o.customer_phone === selected.phone).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        : [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-[#C9974A]/20 shadow-sm">
                <div>
                    <h3 className="text-[#4E1414] font-black text-lg">Customer Identity Ledger</h3>
                    <p className="text-[#241B15]/60 text-sm mt-1">Track loyalty, lifetime value, and visit history.</p>
                </div>
                <div className="flex bg-white border border-[#C9974A]/40 rounded-xl overflow-hidden shadow-sm w-full md:w-64">
                    <div className="pl-3 py-2 flex items-center justify-center text-[#C9974A]">
                        <Search className="w-5 h-5" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by name or phone..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="px-3 py-2 outline-none text-[#241B15] w-full text-sm font-bold"
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#C9974A]/20 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-[#F6EEDF]/50 text-[#4E1414] font-black uppercase text-[11px] tracking-wider border-b border-[#C9974A]/20">
                            <tr>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Phone</th>
                                <th className="px-6 py-4">Visits</th>
                                <th className="px-6 py-4">Lifetime Total</th>
                                <th className="px-6 py-4">Latest Encounter</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#C9974A]/10">
                            {filtered.map((c, i) => (
                                <tr
                                    key={i}
                                    onClick={() => setSelected(c)}
                                    className="hover:bg-[#F6EEDF]/50 transition-colors cursor-pointer"
                                >
                                    <td className="px-6 py-4 font-bold text-[#241B15] flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-[#4E1414]/10 text-[#4E1414] flex items-center justify-center">
                                            <User className="w-4 h-4" />
                                        </div>
                                        {c.name || 'Unknown'}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-[#241B15]/60">{c.phone || 'N/A'}</td>
                                    <td className="px-6 py-4 font-black text-[#4E1414]">{c.visits}</td>
                                    <td className="px-6 py-4 font-black text-[#C9974A]">₹{c.totalSpent.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-xs font-semibold text-[#241B15]/50">{format(new Date(c.lastVisit), 'MMM dd, yyyy')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Profile Drawer / Modal */}
            {selected && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
                    <div className="bg-[#F6EEDF] w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right overflow-hidden">
                        <div className="bg-[#4E1414] px-6 py-5 flex justify-between items-center shrink-0">
                            <h3 className="text-[#F6EEDF] font-black text-xl">Customer Profile</h3>
                            <button onClick={() => setSelected(null)} className="text-[#F6EEDF]/70 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-8 pb-4 shrink-0 border-b border-[#C9974A]/20">
                            <h2 className="text-3xl font-black text-[#4E1414] mb-1">{selected.name || 'Unknown'}</h2>
                            <p className="text-[#241B15]/60 font-bold mb-6">{selected.phone || 'No Phone Number'}</p>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-4 rounded-xl border border-[#C9974A]/30">
                                    <p className="text-[10px] font-black text-[#4E1414] uppercase tracking-wider mb-1">Lifetime Value</p>
                                    <p className="text-2xl font-black text-[#C9974A]">₹{selected.totalSpent.toLocaleString()}</p>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-[#C9974A]/30">
                                    <p className="text-[10px] font-black text-[#4E1414] uppercase tracking-wider mb-1">Avg per Visit</p>
                                    <p className="text-2xl font-black text-[#241B15]">₹{Math.round(selected.totalSpent / selected.visits).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto taj-scrollbar p-8">
                            <h4 className="text-sm font-black text-[#4E1414] uppercase tracking-wider mb-4">Visit History</h4>
                            <div className="space-y-4">
                                {customerOrders.map(o => {
                                    const total = o.order_items?.reduce((s: number, i: any) => s + (i.price_at_order * i.qty), 0) || 0;
                                    return (
                                        <div key={o.id} className="bg-white p-4 rounded-xl border border-[#C9974A]/20 shadow-sm">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-bold text-[#241B15]">{format(new Date(o.created_at), 'MMM dd, yyyy')}</span>
                                                <span className="font-black text-[#C9974A]">₹{total.toFixed(2)}</span>
                                            </div>
                                            <p className="text-xs font-semibold text-[#241B15]/50">
                                                Order #{o.id.split('-').pop()} • {o.restaurant_tables?.table_no ? `Table ${o.restaurant_tables.table_no}` : 'Takeaway'}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
