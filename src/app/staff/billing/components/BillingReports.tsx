"use client";

import { motion } from 'framer-motion';
import { 
    BarChart3, ArrowLeft, Banknote, CreditCard, QrCode, 
    TrendingUp 
} from 'lucide-react';
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
    history: any[];
    menuItemsList: any[];
}

export function BillingReports({
    dayStats,
    setView,
    selectedReport,
    setSelectedReport,
    history,
    menuItemsList
}: Props) {
    const totalPayments = (dayStats.cashSales + dayStats.cardSales + dayStats.upiSales) || 1;
    const cashPct = Math.round((dayStats.cashSales / totalPayments) * 100);
    const cardPct = Math.round((dayStats.cardSales / totalPayments) * 100);
    const upiPct = Math.round((dayStats.upiSales / totalPayments) * 100);

    // Map menu items to category names dynamically
    const menuCategoryMap: Record<string, string> = {};
    menuItemsList.forEach(m => {
        if (m.id) {
            menuCategoryMap[m.id] = m.categories?.name || 'Uncategorized';
        }
    });

    // Calculate real sales contribution by category dynamically
    const categorySales: Record<string, { name: string; items: number; sales: number; pct: number }> = {};
    let totalCategorySalesVal = 0;

    history.forEach(order => {
        order.order_items?.forEach((i: any) => {
            const itemId = i.menu_items?.id;
            const categoryName = menuCategoryMap[itemId] || 'Uncategorized';
            const itemSaleValue = (i.qty * i.price_at_order);

            if (!categorySales[categoryName]) {
                categorySales[categoryName] = { name: categoryName, items: 0, sales: 0, pct: 0 };
            }
            categorySales[categoryName].sales += itemSaleValue;
            categorySales[categoryName].items += i.qty;
            totalCategorySalesVal += itemSaleValue;
        });
    });

    const finalCategories = Object.values(categorySales).map(c => ({
        ...c,
        pct: totalCategorySalesVal > 0 ? Math.round((c.sales / totalCategorySalesVal) * 100) : 0
    })).sort((a, b) => b.sales - a.sales);

    const categories = finalCategories;

    // Calculate real top selling items dynamically
    const itemTotals: Record<string, { name: string; qty: number; revenue: number }> = {};
    history.forEach(order => {
        order.order_items?.forEach((i: any) => {
            const name = i.menu_items?.name;
            if (name) {
                if (!itemTotals[name]) {
                    itemTotals[name] = { name, qty: 0, revenue: 0 };
                }
                itemTotals[name].qty += i.qty;
                itemTotals[name].revenue += (i.qty * i.price_at_order);
            }
        });
    });

    const topSellingItems = Object.values(itemTotals)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5);

    return (
        <div className="space-y-6">
            {/* Header section */}
            <div className="bg-white border border-[#C9974A]/30 p-5 rounded-2xl shadow-sm flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h2 className="font-black text-xl text-[#4E1414] flex items-center gap-2">
                        <BarChart3 className="w-6 h-6 text-[#C9974A]" /> POS Sales Intelligence Report
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">Granular shift metrics, settlement summaries, and category performance logs.</p>
                </div>
                <button
                    onClick={() => setView('bento')}
                    className="flex items-center gap-1.5 bg-white border border-[#C9974A]/30 hover:bg-[#F6EEDF]/20 text-[#4E1414] text-xs font-black px-4 py-2.5 rounded-xl transition-all shadow-sm"
                >
                    <ArrowLeft className="w-4 h-4 text-[#C9974A]" /> Cashier Dashboard
                </button>
            </div>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* 1. Large Main Revenue Bento Card (Col-span 2) */}
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="md:col-span-2 bg-[#4E1414] border border-[#C9974A]/30 p-6 rounded-3xl text-[#F6EEDF] shadow-sm flex flex-col justify-between relative overflow-hidden group min-h-[220px]"
                >
                    {/* Decorative Background Pattern */}
                    <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-6 translate-y-6 pointer-events-none transition-transform group-hover:scale-110 duration-500">
                        <BarChart3 className="w-64 h-64" />
                    </div>
                    
                    <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#C9974A] bg-[#F6EEDF]/10 px-2.5 py-1 rounded-full">Aggregate Gross Revenue</span>
                        <div className="flex items-baseline gap-2 pt-2">
                            <span className="text-4xl md:text-5xl font-black tracking-tight">{fmt(dayStats.revenue)}</span>
                            <span className="text-xs text-[#C9974A] font-bold">Today's Shift</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-6 border-t border-[#F6EEDF]/15 mt-4">
                        <div>
                            <span className="block text-[9px] text-[#C9974A] uppercase font-black">Tickets Closed</span>
                            <span className="text-lg font-black">{dayStats.bills}</span>
                        </div>
                        <div>
                            <span className="block text-[9px] text-[#C9974A] uppercase font-black">Average Ticket</span>
                            <span className="text-lg font-black">{fmt(dayStats.avgBill)}</span>
                        </div>
                        <div>
                            <span className="block text-[9px] text-[#C9974A] uppercase font-black">Active Dining Tables</span>
                            <span className="text-lg font-black text-green-400">{dayStats.activeTables}</span>
                        </div>
                    </div>
                </motion.div>

                {/* 2. Payment Distribution Bento Card */}
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="bg-white border border-[#C9974A]/30 p-6 rounded-3xl shadow-sm flex flex-col justify-between min-h-[220px]"
                >
                    <div className="space-y-1">
                        <h4 className="text-xs font-black uppercase tracking-wider text-[#4E1414]">Settlement Breakdown</h4>
                        <p className="text-[10px] text-gray-400">Shift collection methods distribution.</p>
                    </div>

                    <div className="space-y-3 pt-3">
                        {/* UPI */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs font-bold text-gray-600">
                                <span className="flex items-center gap-1.5"><QrCode className="w-3.5 h-3.5 text-[#C9974A]" /> UPI Payments</span>
                                <span>{upiPct}% ({fmt(dayStats.upiSales)})</span>
                            </div>
                            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${upiPct}%` }} />
                            </div>
                        </div>

                        {/* Cash */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs font-bold text-gray-600">
                                <span className="flex items-center gap-1.5"><Banknote className="w-3.5 h-3.5 text-green-600" /> Cash Settlements</span>
                                <span>{cashPct}% ({fmt(dayStats.cashSales)})</span>
                            </div>
                            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                <div className="bg-green-600 h-full rounded-full transition-all duration-500" style={{ width: `${cashPct}%` }} />
                            </div>
                        </div>

                        {/* Card */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs font-bold text-gray-600">
                                <span className="flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5 text-amber-600" /> Credit/Debit Cards</span>
                                <span>{cardPct}% ({fmt(dayStats.cardSales)})</span>
                            </div>
                            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${cardPct}%` }} />
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* 3. Category Sales Bento Card */}
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white border border-[#C9974A]/30 p-6 rounded-3xl shadow-sm flex flex-col justify-between min-h-[220px]"
                >
                    <div className="space-y-1">
                        <h4 className="text-xs font-black uppercase tracking-wider text-[#4E1414]">Category Contributions</h4>
                        <p className="text-[10px] text-gray-400">Total volume and revenue by section.</p>
                    </div>

                    <div className="space-y-3.5 pt-3">
                        {categories.map((c, i) => (
                            <div key={i} className="space-y-1">
                                <div className="flex justify-between text-xs font-bold text-gray-700">
                                    <span>{c.name}</span>
                                    <span>{fmt(c.sales)}</span>
                                </div>
                                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-[#4E1414] h-full rounded-full" style={{ width: `${c.pct}%` }} />
                                </div>
                            </div>
                        ))}
                        {categories.length === 0 && (
                            <p className="text-center text-xs text-gray-400 italic py-12">No category sales recorded yet.</p>
                        )}
                    </div>
                </motion.div>

                {/* 4. Top Selling Items (Col-span 2) */}
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="md:col-span-2 bg-white border border-[#C9974A]/30 p-6 rounded-3xl shadow-sm flex flex-col justify-between min-h-[220px]"
                >
                    <div className="space-y-1 pb-3">
                        <h4 className="text-xs font-black uppercase tracking-wider text-[#4E1414]">Popular Items Distribution</h4>
                        <p className="text-[10px] text-gray-400">Top billing items by quantities sold and aggregate revenue.</p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                            <thead className="bg-[#F6EEDF]/40 text-[#4E1414] font-black uppercase text-[9px] tracking-wider border-b border-[#C9974A]/25">
                                <tr>
                                    <th className="px-4 py-2">Item Name</th>
                                    <th className="px-4 py-2 text-center">Qty Sold</th>
                                    <th className="px-4 py-2 text-right">Revenue Generated</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#C9974A]/10">
                                {topSellingItems.map((item, i) => (
                                    <tr key={i} className="hover:bg-[#F6EEDF]/20">
                                        <td className="px-4 py-2.5 font-bold text-gray-800">{item.name}</td>
                                        <td className="px-4 py-2.5 font-black text-center text-[#4E1414]">{item.qty}</td>
                                        <td className="px-4 py-2.5 font-black text-right text-[#C9974A]">{fmt(item.revenue)}</td>
                                    </tr>
                                ))}
                                {topSellingItems.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="text-center text-xs text-gray-400 italic py-10">
                                            No sales logged for this shift yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>

            </div>
        </div>
    );
}
