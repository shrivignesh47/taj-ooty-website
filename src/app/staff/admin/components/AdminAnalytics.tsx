/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar } from 'recharts';
import { format, subDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { TrendingUp, DollarSign, Activity, CalendarDays } from 'lucide-react';

interface Props {
    orders: any[];
    menu: any[];
}

export function AdminAnalytics({ orders, menu }: Props) {
    const [timeframe, setTimeframe] = useState<'7' | '30'>('7');

    const analysis = useMemo(() => {
        const now = new Date();
        const start = startOfDay(subDays(now, parseInt(timeframe) - 1));
        const end = endOfDay(now);

        const filteredOrders = orders.filter(o =>
            ['billed', 'served', 'completed'].includes(o.status) &&
            isWithinInterval(new Date(o.created_at), { start, end })
        );

        let rev = 0;
        const trendMap = new Map<string, number>();
        const categoryMap = new Map<string, number>();
        const hourlyMap = new Map<string, number>();

        // initialize trend map
        for (let i = parseInt(timeframe) - 1; i >= 0; i--) {
            trendMap.set(format(subDays(now, i), 'MMM dd'), 0);
        }

        // initialize hourly map (0 to 23)
        for (let i = 0; i < 24; i++) {
            hourlyMap.set(`${i}:00`, 0);
        }

        filteredOrders.forEach(o => {
            const dateStr = format(new Date(o.created_at), 'MMM dd');
            const hourStr = `${new Date(o.created_at).getHours()}:00`;

            let orderTotal = 0;
            o.order_items?.forEach((item: any) => {
                const lineTotal = item.price_at_order * item.qty;
                orderTotal += lineTotal;

                // For category breakdown, we need category name from menu list
                const menuItem = menu.find(m => m.id === item.menu_item_id);
                if (menuItem?.categories?.name) {
                    categoryMap.set(menuItem.categories.name, (categoryMap.get(menuItem.categories.name) || 0) + lineTotal);
                }
            });

            rev += orderTotal;
            if (trendMap.has(dateStr)) trendMap.set(dateStr, trendMap.get(dateStr)! + orderTotal);
            if (hourlyMap.has(hourStr)) hourlyMap.set(hourStr, hourlyMap.get(hourStr)! + 1); // count orders for heatmap
        });

        const turnData = Array.from(trendMap.entries()).map(([name, Revenue]) => ({ name, Revenue }));

        const catData = Array.from(categoryMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); // top 5

        const peakData = Array.from(hourlyMap.entries())
            .map(([name, Orders]) => ({ name, Orders }))
            .filter(d => parseInt(d.name) > 8 && parseInt(d.name) < 24); // Show 9AM to Midnight

        return {
            revenue: rev,
            ordersCount: filteredOrders.length,
            aov: filteredOrders.length > 0 ? rev / filteredOrders.length : 0,
            turnData,
            catData,
            peakData
        };
    }, [orders, menu, timeframe]);

    const COLORS = ['#4E1414', '#C9974A', '#8b3d3d', '#d9b37a', '#241B15'];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-[#C9974A]/20 shadow-sm">
                <div>
                    <h3 className="text-[#4E1414] font-black text-lg">Revenue Analytics & Trends</h3>
                    <p className="text-[#241B15]/60 text-sm mt-1">Deep dive into financial and operational metrics.</p>
                </div>
                <div className="flex gap-2 bg-[#F6EEDF] p-1 rounded-xl border border-[#C9974A]/30">
                    <button
                        onClick={() => setTimeframe('7')}
                        className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${timeframe === '7' ? 'bg-[#4E1414] text-white shadow' : 'text-[#4E1414] hover:bg-[#e4d7be]'}`}
                    >
                        Last 7 Days
                    </button>
                    <button
                        onClick={() => setTimeframe('30')}
                        className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${timeframe === '30' ? 'bg-[#4E1414] text-white shadow' : 'text-[#4E1414] hover:bg-[#e4d7be]'}`}
                    >
                        Last 30 Days
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#C9974A]/20 flex items-center gap-4">
                    <div className="bg-[#4E1414]/10 p-4 rounded-xl text-[#4E1414]">
                        <DollarSign className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-[#241B15]/50 uppercase tracking-wider mb-1">Total Revenue</p>
                        <h4 className="text-3xl font-black text-[#4E1414]">₹{analysis.revenue.toLocaleString()}</h4>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#C9974A]/20 flex items-center gap-4">
                    <div className="bg-[#C9974A]/20 p-4 rounded-xl text-[#C9974A]">
                        <Activity className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-[#241B15]/50 uppercase tracking-wider mb-1">Total Orders</p>
                        <h4 className="text-3xl font-black text-[#241B15]">{analysis.ordersCount}</h4>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#C9974A]/20 flex items-center gap-4">
                    <div className="bg-[#4E1414]/10 p-4 rounded-xl text-[#4E1414]">
                        <TrendingUp className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-[#241B15]/50 uppercase tracking-wider mb-1">Average Order Value</p>
                        <h4 className="text-3xl font-black text-[#241B15]">₹{analysis.aov.toFixed(0)}</h4>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#C9974A]/20">
                    <h4 className="text-sm font-black text-[#4E1414] uppercase tracking-wider mb-6 flex items-center gap-2">
                        <CalendarDays className="w-4 h-4" /> Revenue Trend
                    </h4>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analysis.turnData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4E1414" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#4E1414" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#241B15', opacity: 0.6 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 12, fill: '#241B15', opacity: 0.6 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: any) => [`₹${value}`, 'Revenue']}
                                />
                                <Area type="monotone" dataKey="Revenue" stroke="#4E1414" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#C9974A]/20">
                    <h4 className="text-sm font-black text-[#4E1414] uppercase tracking-wider mb-6 flex items-center gap-2">
                        <Activity className="w-4 h-4" /> Category Breakdown
                    </h4>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={analysis.catData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={3}
                                    dataKey="value"
                                >
                                    {analysis.catData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: any) => [`₹${value}`, 'Revenue']} />
                                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#C9974A]/20">
                <h4 className="text-sm font-black text-[#4E1414] uppercase tracking-wider mb-6 flex items-center gap-2">
                    <Activity className="w-4 h-4" /> Peak Order Hours
                </h4>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analysis.peakData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#241B15', opacity: 0.6 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 12, fill: '#241B15', opacity: 0.6 }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip cursor={{ fill: '#F6EEDF' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            <Bar dataKey="Orders" fill="#C9974A" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
