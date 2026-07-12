"use client";

import { BarChart3 } from 'lucide-react';
import { fmt } from './utils';

interface Props {
    dayStats: {
        revenue: number;
        bills: number;
        avgBill: number;
        activeTables: number;
        cashSales: number;
        cardSales: number;
        upiSales: number;
    };
    setView: (view: 'bento' | 'tables' | 'takeaway' | 'history' | 'reports') => void;
    selectedReport: string;
    setSelectedReport: (report: string) => void;
}

export function BillingReports({
    dayStats,
    setView,
    selectedReport,
    setSelectedReport
}: Props) {
    return (
        <div className="bg-white border border-[#C9974A]/30 p-6 rounded-2xl shadow-sm space-y-6">
            <div className="flex justify-between items-center border-b border-[#C9974A]/20 pb-4">
                <div>
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-[#C9974A]" /> Daily POS Reports
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">Granular summaries of shift transactions.</p>
                </div>
                <button onClick={() => setView('bento')} className="text-xs text-[#C9974A] hover:underline font-bold">← Dashboard</button>
            </div>

            <div className="flex bg-[#F6EEDF]/40 border border-[#C9974A]/30 rounded-xl p-1 max-w-md mb-4">
                {['Category Summary', 'Item Summary', 'Sales Summary'].map(rep => (
                    <button
                        key={rep}
                        onClick={() => setSelectedReport(rep)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${selectedReport === rep ? 'bg-[#4E1414] text-[#F6EEDF]' : 'text-gray-400'}`}
                    >
                        {rep}
                    </button>
                ))}
            </div>

            {/* Reports panel */}
            <div className="bg-[#F6EEDF]/20 p-4 rounded-xl border border-[#C9974A]/20 min-h-[220px]">
                {selectedReport === 'Sales Summary' && (
                    <div className="space-y-3 text-xs">
                        <div className="flex justify-between border-b pb-2"><span>Total Cash Payments</span><span className="font-bold">{fmt(dayStats.cashSales)}</span></div>
                        <div className="flex justify-between border-b pb-2"><span>Total Card Payments</span><span className="font-bold">{fmt(dayStats.cardSales)}</span></div>
                        <div className="flex justify-between border-b pb-2"><span>Total UPI Payments</span><span className="font-bold">{fmt(dayStats.upiSales)}</span></div>
                        <div className="flex justify-between font-black text-sm pt-2 text-[#4E1414]"><span>Aggregate Gross Sales</span><span>{fmt(dayStats.revenue)}</span></div>
                    </div>
                )}

                {selectedReport === 'Category Summary' && (
                    <div className="space-y-3 text-xs">
                        <div className="flex justify-between border-b pb-2"><span>Beverages</span><span className="font-bold">24 items · ₹3,450</span></div>
                        <div className="flex justify-between border-b pb-2"><span>Tandoor & Grill</span><span className="font-bold">12 items · ₹5,120</span></div>
                        <div className="flex justify-between border-b pb-2"><span>Breads & Naan</span><span className="font-bold">45 items · ₹2,100</span></div>
                        <div className="flex justify-between border-b pb-2"><span>Curries & Gravy</span><span className="font-bold">18 items · ₹8,200</span></div>
                    </div>
                )}

                {selectedReport === 'Item Summary' && (
                    <div className="space-y-3 text-xs text-gray-500 italic text-center py-10">
                        Summary of item-wise sales distribution logs.
                    </div>
                )}
            </div>
        </div>
    );
}
