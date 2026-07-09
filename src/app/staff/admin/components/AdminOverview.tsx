/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export function AdminOverview({ metrics, ticketTypes, revenueChartData, totalOrders }: any) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left/Center Column Cards */}
            <div className="md:col-span-12 lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-[#4E1414] to-[#350C0C] p-6 rounded-3xl shadow-md flex flex-col justify-center text-[#F6EEDF] relative overflow-hidden">
                        <span className="text-sm font-bold opacity-90 mb-1 text-[#C9974A]">Total Revenue</span>
                        <span className="text-2xl xl:text-3xl font-black font-mono">₹{metrics.revenue.toLocaleString()}</span>
                        <div className="mt-4 bg-[#C9974A]/20 text-[#C9974A] text-xs font-bold inline-block px-2 py-1 rounded w-fit">+ 14.5%</div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#C9974A]/20 flex flex-col justify-center relative">
                        <span className="text-sm font-bold text-[#4E1414] mb-1">Active Walk-ins</span>
                        <span className="text-2xl xl:text-3xl font-black text-[#241B15]">{metrics.activeTables * 3}</span>
                        <div className="mt-4 bg-[#4EBF84]/10 text-[#4EBF84] text-xs font-bold inline-block px-2 py-1 rounded w-fit">+ 5.4%</div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#C9974A]/20 flex flex-col justify-center">
                        <span className="text-sm font-bold text-[#4E1414] mb-1">Monthly Yield</span>
                        <span className="text-2xl xl:text-3xl font-black text-[#241B15]">{metrics.monthlyVisits}</span>
                    </div>
                    <div className="bg-gradient-to-br from-[#C9974A] to-[#B3833B] p-6 rounded-3xl shadow-md flex flex-col justify-center text-[#350C0C] border border-[#C9974A]">
                        <span className="text-sm font-bold opacity-80 mb-1">Total Orders</span>
                        <span className="text-2xl xl:text-3xl font-black">{totalOrders}</span>
                        <div className="mt-4 bg-black/5 text-[#350C0C] text-xs font-bold inline-block px-2 py-1 rounded w-fit">+ 1.2%</div>
                    </div>
                </div>

                {/* Pie Chart Card (Order Status) */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#C9974A]/20 mt-2 flex flex-col items-center">
                    <div className="w-full text-left font-bold text-[#4E1414] text-lg mb-2">Order Tracking</div>
                    <PieChart width={220} height={220}>
                        <Pie data={ticketTypes} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                            <Cell fill="#C9974A" />
                            <Cell fill="#4E1414" />
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#F6EEDF', borderRadius: '12px', border: '1px solid #C9974A', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    </PieChart>
                    <div className="flex gap-4 w-full justify-center">
                        <span className="text-xs font-bold text-[#241B15] flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#C9974A]"></span> Pending</span>
                        <span className="text-xs font-bold text-[#241B15] flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#4E1414]"></span> Computed</span>
                    </div>
                </div>
            </div>

            {/* Right Flow (Charts overlay) */}
            <div className="md:col-span-12 lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
                <div className="bg-[#FFFFFF] p-8 rounded-3xl shadow-sm border border-[#C9974A]/20 flex-1 flex flex-col relative overflow-hidden">
                    <div className="z-10">
                        <h3 className="font-bold text-[#4E1414] text-xl tracking-tight">Sales Analytics Pipeline</h3>
                        <p className="text-xs font-bold text-[#C9974A] mt-1 uppercase tracking-wider">₹ Multi-Tier Trajectory</p>
                    </div>
                    <div className="flex-1 mt-6 h-full min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueChartData}>
                                <defs>
                                    <linearGradient id="colorO" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#C9974A" stopOpacity={0.5} />
                                        <stop offset="95%" stopColor="#C9974A" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" stroke="#C9974A" tick={{ fill: '#4E1414', fontSize: 12, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                <YAxis stroke="#C9974A" tick={{ fill: '#4E1414', fontSize: 12, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#F6EEDF', borderRadius: '12px', border: '1px solid #C9974A', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                <Area type="monotone" dataKey="uv" stroke="#4E1414" strokeWidth={4} fillOpacity={1} fill="url(#colorO)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
