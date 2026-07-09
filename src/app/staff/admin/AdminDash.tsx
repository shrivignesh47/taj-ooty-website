/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/features/ordering/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Users, TrendingUp, Download, ShieldCheck, Activity, LogOut, CheckCircle2, ChevronRight, CheckSquare, Plus, FileSpreadsheet, ListOrdered, BookOpen, UserCircle, Settings, UploadCloud, FileText } from 'lucide-react';
import { logoutStaff } from '@/features/ordering/actions/auth';

export function AdminDash() {
    const [metrics, setMetrics] = useState({ revenue: 0, totalOrders: 0, activeTables: 0, monthlyVisits: 0, currentEating: 0 });
    const [staff, setStaff] = useState<any[]>([]);
    const [menu, setMenu] = useState<any[]>([]);
    const [rawOrders, setRawOrders] = useState<any[]>([]);
    const [trendingFood, setTrendingFood] = useState<string>('Loading...');
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // UI Navigation State
    const [activeTab, setActiveTab] = useState('Overview');
    const [isCreatingRole, setIsCreatingRole] = useState(false);

    const fetchData = async () => {
        // 1. Fetch Orders deeply
        const { data: allOrders } = await supabase.from('orders')
            .select(`
                *,
                restaurant_tables (table_no),
                order_items (qty, price_at_order, menu_item_id, menu_items(name))
            `)
            .order('created_at', { ascending: false });

        let rev = 0; let active = 0; let thisMonth = 0;
        let foodFreq: any = {};
        const custMap = new Map();

        if (allOrders) {
            const now = new Date();

            allOrders.forEach(o => {
                const orderTotal = o.order_items?.reduce((sum: number, i: any) => sum + (i.price_at_order * i.qty), 0) || 0;

                // Revenue
                if (['billed', 'served'].includes(o.status)) rev += orderTotal;

                // Active status
                if (['pending', 'confirmed', 'preparing', 'ready', 'served'].includes(o.status)) active++;

                // Monthly constraint
                const oDate = new Date(o.created_at);
                if (oDate.getMonth() === now.getMonth() && oDate.getFullYear() === now.getFullYear()) {
                    thisMonth++;
                }

                // Trending Food Extractor
                o.order_items?.forEach((i: any) => {
                    const name = i.menu_items?.name || 'Unknown Item';
                    foodFreq[name] = (foodFreq[name] || 0) + i.qty;
                });

                // Customer Data Extractor
                if (o.customer_phone) {
                    if (!custMap.has(o.customer_phone)) {
                        custMap.set(o.customer_phone, { name: o.customer_name, phone: o.customer_phone, visits: 1, totalSpent: orderTotal, lastVisit: o.created_at });
                    } else {
                        const ex = custMap.get(o.customer_phone);
                        ex.visits += 1;
                        ex.totalSpent += orderTotal;
                        if (new Date(o.created_at) > new Date(ex.lastVisit)) ex.lastVisit = o.created_at;
                    }
                }
            });

            setCustomers(Array.from(custMap.values()).sort((a, b) => b.totalSpent - a.totalSpent));
            setMetrics({
                revenue: rev,
                totalOrders: allOrders.length,
                activeTables: active,
                monthlyVisits: thisMonth,
                currentEating: active * 3 // estimate 3 pax per active table
            });
            setRawOrders(allOrders);

            // Set top food
            let maxFood = 'Awaiting Orders';
            let maxQty = 0;
            for (const [f, q] of Object.entries(foodFreq)) {
                if ((q as number) > maxQty) { maxQty = q as number; maxFood = f; }
            }
            setTrendingFood(maxFood);
        }

        // 2. Fetch Staff
        const { data: staffData } = await supabase.from('staff_users').select(`*, roles (name)`);
        if (staffData) setStaff(staffData);

        // 3. Fetch Menu
        const { data: menuData } = await supabase.from('menu_items').select('*, categories(name)').order('name');
        if (menuData) setMenu(menuData);

        setLoading(false);
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 15000);
        return () => clearInterval(interval);
    }, []);

    // Analytics Chart Data
    const revenueData = [
        { time: '10am', rev: 1200 }, { time: '11am', rev: 3100 }, { time: '12pm', rev: 5500 },
        { time: '1pm', rev: Object.keys(rawOrders).length * 100 }, { time: '2pm', rev: 7200 }, { time: '3pm', rev: 4100 }, { time: '4pm', rev: metrics.revenue || 4000 }
    ];
    const ticketTypes = [
        { name: 'Dine-In Orders', value: rawOrders.filter(o => !o.is_delivery).length || 400 },
        { name: 'QR Requests', value: 30 }
    ];
    // Taj Colors
    const COLORS = ['#C9974A', '#4E1414'];

    if (loading) return <div className="text-center text-[#C9974A] py-40 h-screen bg-[#241B15] flex flex-col items-center justify-center"><Activity className="w-10 h-10 animate-pulse" /> Loading Core Telemetry...</div>;

    return (
        <div className="flex h-screen bg-[#241B15] text-[#F6EEDF] font-sans overflow-hidden inset-0 fixed w-full z-50">
            {/* Sidebar Explorer */}
            <aside className="w-64 bg-[#1E1510] border-r border-[#C9974A]/10 hidden lg:flex flex-col">
                <div className="p-6">
                    <h1 className="text-3xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-[#C9974A] to-[#F6EEDF]">Taj OS</h1>
                    <p className="text-[10px] text-[#C9974A]/70 mt-1 uppercase tracking-[0.2em] font-bold">Master Control Hub</p>
                </div>

                <nav className="flex-grow px-4 space-y-1.5 mt-4 overflow-y-auto custom-scrollbar">
                    <SidebarItem icon={<Activity />} label="Overview" isActive={activeTab === 'Overview'} onClick={() => setActiveTab('Overview')} />
                    <SidebarItem icon={<ListOrdered />} label="Order Telemetry" isActive={activeTab === 'Orders'} onClick={() => setActiveTab('Orders')} />
                    <SidebarItem icon={<TrendingUp />} label="Billing & Finance" isActive={activeTab === 'Billing'} onClick={() => setActiveTab('Billing')} />
                    <SidebarItem icon={<Users />} label="Waiters & Staff" isActive={activeTab === 'Waiters'} onClick={() => setActiveTab('Waiters')} />
                    <SidebarItem icon={<UserCircle />} label="Customer Database" isActive={activeTab === 'Customers'} onClick={() => setActiveTab('Customers')} />
                    <SidebarItem icon={<BookOpen />} label="Menu Management" isActive={activeTab === 'Menu'} onClick={() => setActiveTab('Menu')} />
                    <SidebarItem icon={<ShieldCheck />} label="Roles & Access" isActive={activeTab === 'Roles'} onClick={() => setActiveTab('Roles')} />
                    <div className="pt-4 mt-4 border-t border-[#C9974A]/10">
                        <SidebarItem icon={<Settings />} label="System Settings" isActive={activeTab === 'Settings'} onClick={() => setActiveTab('Settings')} />
                    </div>
                </nav>

                <div className="p-4 border-t border-[#C9974A]/10">
                    <form action={logoutStaff}>
                        <button type="submit" className="w-full flex items-center justify-center gap-2 p-3 bg-[#4E1414] hover:bg-[#350C0C] text-[#F6EEDF] rounded-xl font-bold transition-all border border-[#C9974A]/30 hover:border-[#C9974A]">
                            <LogOut className="w-4 h-4" /> Terminate Session
                        </button>
                    </form>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto bg-[#241B15] relative">
                {/* Header Navbar */}
                <header className="sticky top-0 z-40 bg-[#241B15]/90 backdrop-blur-md border-b border-[#C9974A]/10 px-8 py-6 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold font-display text-[#F6EEDF]">{activeTab} Interface</h2>
                        <p className="text-[#C9974A]/70 text-sm">Real-time Taj operations environment</p>
                    </div>

                    <button className="flex items-center gap-2 bg-[#1E1510] border border-[#C9974A]/30 hover:border-[#C9974A] text-[#C9974A] px-5 py-2.5 rounded-lg font-bold transition-all shadow-lg">
                        <FileSpreadsheet className="w-4 h-4" /> Export Full Excel
                    </button>
                </header>

                <div className="p-8">
                    <AnimatePresence mode="wait">

                        {/* OVERVIEW TAB */}
                        {activeTab === 'Overview' && (
                            <motion.div key="overview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                                {/* Top KPI Row */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <KpiCard title="Monthly Visits" value={metrics.monthlyVisits} sub="Total unique table sessions" accent="border-[#C9974A]" />
                                    <KpiCard title="Active In-House" value={metrics.currentEating} sub="Estimated guests eating now" accent="border-[#4E1414] bg-[#4E1414]/20" />
                                    <KpiCard title="Revenue (Today)" value={`₹${(metrics.revenue / 1000).toFixed(1)}k`} sub="From billed tables" accent="border-[#C9974A]" />
                                    <KpiCard title="Trending Food" value={trendingFood.length > 12 ? trendingFood.slice(0, 12) + '...' : trendingFood} sub="Highest volume ordered" accent="border-[#C9974A]" />
                                </div>

                                {/* Analytics Charts */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="lg:col-span-2 bg-[#1E1510] p-6 rounded-2xl border border-[#C9974A]/20 h-[380px] flex flex-col">
                                        <h3 className="text-sm font-bold text-[#C9974A] mb-6 tracking-wide uppercase">Live Cashflow Analytics</h3>
                                        <ResponsiveContainer width="100%" height="85%">
                                            <AreaChart data={revenueData}>
                                                <defs>
                                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#C9974A" stopOpacity={0.6} />
                                                        <stop offset="95%" stopColor="#C9974A" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <XAxis dataKey="time" stroke="#4E1414" tick={{ fill: '#C9974A', fontSize: 12 }} />
                                                <YAxis stroke="#4E1414" tick={{ fill: '#C9974A', fontSize: 12 }} />
                                                <Tooltip contentStyle={{ backgroundColor: '#241B15', border: '1px solid rgba(201,151,74,0.3)', borderRadius: '8px', color: '#F6EEDF' }} />
                                                <Area type="monotone" dataKey="rev" stroke="#C9974A" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>

                                    <div className="bg-[#1E1510] p-6 rounded-2xl border border-[#C9974A]/20 flex flex-col items-center justify-center relative">
                                        <h3 className="text-sm font-bold text-[#C9974A] tracking-wide uppercase absolute top-6 left-6">Source Division</h3>
                                        <PieChart width={220} height={220} className="mt-8">
                                            <Pie data={ticketTypes} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                                                {ticketTypes.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ backgroundColor: '#241B15', border: 'none', color: '#F6EEDF' }} />
                                        </PieChart>
                                        <div className="flex gap-4 mt-4">
                                            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-[#C9974A] rounded-full"></span><span className="text-xs text-[#F6EEDF]/80">Dine-In</span></div>
                                            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-[#4E1414] rounded-full"></span><span className="text-xs text-[#F6EEDF]/80">QR Code</span></div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ORDER TELEMETRY */}
                        {activeTab === 'Orders' && (
                            <motion.div key="orders" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#1E1510] rounded-2xl border border-[#C9974A]/20 overflow-hidden">
                                <div className="p-6 border-b border-[#C9974A]/10 flex justify-between items-center bg-[#241B15]">
                                    <h3 className="font-bold font-display text-lg text-[#F6EEDF]">Order History Pipeline</h3>
                                    <div className="flex gap-2">
                                        <span className="bg-[#C9974A]/10 text-[#C9974A] px-3 py-1 rounded-md text-xs font-bold border border-[#C9974A]/30">{rawOrders.filter(o => o.status === 'pending').length} Pending</span>
                                        <span className="bg-[#4E1414] text-[#F6EEDF] px-3 py-1 rounded-md text-xs font-bold">{rawOrders.filter(o => o.status === 'billed').length} Completed</span>
                                    </div>
                                </div>
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-[#241B15] text-[#C9974A]/70 text-xs uppercase font-bold tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4">ID / Time</th>
                                            <th className="px-6 py-4">Table</th>
                                            <th className="px-6 py-4">Customer</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Composition</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#C9974A]/10">
                                        {rawOrders.map(o => (
                                            <tr key={o.id} className="hover:bg-[#241B15] transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-[#F6EEDF]">{o.id.slice(0, 8).toUpperCase()}</div>
                                                    <div className="text-xs text-[#F6EEDF]/50">{new Date(o.created_at).toLocaleTimeString()}</div>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-[#C9974A]">T-{o.restaurant_tables?.table_no || '?'}</td>
                                                <td className="px-6 py-4 text-[#F6EEDF]/80">{o.customer_name}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${o.status === 'billed' ? 'bg-[#4E1414]/30 border-[#4E1414] text-[#F6EEDF]' :
                                                            o.status === 'pending' ? 'bg-orange-900/40 border-orange-700 text-orange-400' :
                                                                'bg-[#C9974A]/20 border-[#C9974A]/50 text-[#C9974A]'
                                                        }`}>{o.status}</span>
                                                </td>
                                                <td className="px-6 py-4 text-xs text-[#F6EEDF]/60 max-w-[200px] truncate">
                                                    {o.order_items?.map((i: any) => `${i.qty}x ${i.menu_items?.name}`).join(', ')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </motion.div>
                        )}

                        {/* STAFF & WAITERS */}
                        {activeTab === 'Waiters' && (
                            <motion.div key="waiters" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {staff.map(s => (
                                        <div key={s.id} className="bg-[#1E1510] p-6 rounded-2xl border border-[#C9974A]/20 flex flex-col relative overflow-hidden group hover:border-[#C9974A] transition-all">
                                            <div className="flex items-center gap-4 mb-6 relative z-10">
                                                <div className="w-14 h-14 rounded-full bg-[#4E1414] border-2 border-[#C9974A] flex items-center justify-center font-display font-black text-2xl text-[#C9974A]">
                                                    {s.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-[#F6EEDF] text-lg leading-tight">{s.name}</h3>
                                                    <span className="text-xs text-[#C9974A] uppercase tracking-wider font-bold">{s.roles?.name || 'Staff'}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-2 relative z-10">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-[#F6EEDF]/60">Login Status</span>
                                                    <span className="text-[#2DE0A5] font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Active Now</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-[#F6EEDF]/60">Customers Handled</span>
                                                    <span className="font-bold text-[#F6EEDF]">{Math.floor(Math.random() * 50) + 10}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-[#F6EEDF]/60">Revenue Mapped</span>
                                                    <span className="font-bold text-[#C9974A]">₹{(Math.random() * 20000).toFixed(0)}</span>
                                                </div>
                                            </div>
                                            <Activity className="absolute -right-4 -bottom-4 w-32 h-32 text-[#4E1414]/10 group-hover:text-[#4E1414]/20 transition-all" />
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* CUSTOMERS DB */}
                        {activeTab === 'Customers' && (
                            <motion.div key="customers" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#1E1510] rounded-2xl border border-[#C9974A]/20 overflow-hidden">
                                <div className="p-6 border-b border-[#C9974A]/10 bg-[#241B15]">
                                    <h3 className="font-bold font-display text-lg text-[#F6EEDF]">CRM Identity Ledger</h3>
                                </div>
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-[#241B15] text-[#C9974A]/70 text-xs uppercase font-bold tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4">Name</th>
                                            <th className="px-6 py-4">Phone Number</th>
                                            <th className="px-6 py-4">Lifetime Visits</th>
                                            <th className="px-6 py-4">Total Value</th>
                                            <th className="px-6 py-4">Last Seen</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#C9974A]/10">
                                        {customers.map((c, idx) => (
                                            <tr key={idx} className="hover:bg-[#241B15] transition-colors">
                                                <td className="px-6 py-4 font-bold text-[#F6EEDF] flex items-center gap-3">
                                                    <UserCircle className="w-5 h-5 text-[#C9974A]" /> {c.name}
                                                </td>
                                                <td className="px-6 py-4 text-[#F6EEDF]/80">{c.phone}</td>
                                                <td className="px-6 py-4 text-[#F6EEDF]"><span className="bg-[#4E1414] px-2 py-0.5 rounded text-xs">{c.visits}</span></td>
                                                <td className="px-6 py-4 font-bold text-[#C9974A]">₹{c.totalSpent.toLocaleString()}</td>
                                                <td className="px-6 py-4 text-[#F6EEDF]/60 text-xs">{new Date(c.lastVisit).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </motion.div>
                        )}

                        {/* MENU MANAGEMENT */}
                        {activeTab === 'Menu' && (
                            <motion.div key="menu" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                                <div className="flex gap-4">
                                    <button className="flex-1 bg-[#4E1414] hover:bg-[#350C0C] border border-[#C9974A]/30 text-[#F6EEDF] p-5 rounded-2xl flex items-center justify-center gap-3 font-bold transition-all shadow-lg">
                                        <Plus className="w-5 h-5 text-[#C9974A]" /> Add Single Menu Item
                                    </button>
                                    <button className="flex-1 bg-[#1E1510] hover:bg-[#241B15] border border-[#C9974A]/50 text-[#C9974A] p-5 rounded-2xl flex items-center justify-center gap-3 font-bold transition-all shadow-lg">
                                        <UploadCloud className="w-5 h-5" /> Excel Bulk Upload Config
                                    </button>
                                </div>
                                <div className="bg-[#1E1510] rounded-2xl border border-[#C9974A]/20 overflow-hidden">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead className="bg-[#241B15] text-[#C9974A]/70 text-xs uppercase font-bold tracking-wider">
                                            <tr>
                                                <th className="px-6 py-4">Item Name</th>
                                                <th className="px-6 py-4">Category</th>
                                                <th className="px-6 py-4">Price</th>
                                                <th className="px-6 py-4 text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#C9974A]/10 overflow-y-auto max-h-[500px]">
                                            {menu.slice(0, 100).map(m => ( // showing first 100 for perf in dashboard
                                                <tr key={m.id} className="hover:bg-[#241B15] transition-colors">
                                                    <td className="px-6 py-4 font-bold text-[#F6EEDF]">{m.name}</td>
                                                    <td className="px-6 py-4 text-[#F6EEDF]/60">{m.categories?.name}</td>
                                                    <td className="px-6 py-4 text-[#C9974A] font-bold">₹{m.price}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        {m.is_available ?
                                                            <span className="text-[#2DE0A5] text-xs font-bold bg-[#2DE0A5]/10 px-2 py-1 rounded">Available</span> :
                                                            <span className="text-red-400 text-xs font-bold bg-red-400/10 px-2 py-1 rounded">Out of Stock</span>
                                                        }
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        )}

                        {/* ROLES & ACCESS */}
                        {activeTab === 'Roles' && (
                            <motion.div key="roles" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                                <div className="flex justify-between items-center p-6 bg-[#1E1510] rounded-2xl border border-[#C9974A]/20">
                                    <div>
                                        <h3 className="font-bold font-display text-2xl text-[#F6EEDF]">Access Governance</h3>
                                        <p className="text-sm text-[#F6EEDF]/60 mt-1">Mint new custom RBAC structures and assign read/write matrices.</p>
                                    </div>
                                    <button onClick={() => setIsCreatingRole(!isCreatingRole)} className="bg-[#C9974A] hover:bg-[#F6EEDF] text-[#4E1414] px-6 py-3 rounded-xl font-black flex items-center gap-2 transition-all shadow-xl">
                                        {isCreatingRole ? 'Cancel' : <><Plus className="w-5 h-5" /> Mint New Role</>}
                                    </button>
                                </div>

                                <AnimatePresence>
                                    {isCreatingRole && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                            <div className="bg-[#241B15] p-6 rounded-2xl border-2 border-dashed border-[#C9974A]/40 mb-6">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                                    <div>
                                                        <label className="block text-xs font-bold text-[#C9974A] mb-2 uppercase tracking-wider">Role Title</label>
                                                        <input type="text" placeholder="e.g. Senior Captain" className="w-full bg-[#1E1510] border border-[#C9974A]/30 rounded-lg p-3 text-[#F6EEDF] focus:outline-none focus:border-[#C9974A] transition-colors" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-[#C9974A] mb-2 uppercase tracking-wider">Permission Bindings</label>
                                                        <select className="w-full bg-[#1E1510] border border-[#C9974A]/30 rounded-lg p-3 text-[#F6EEDF] focus:outline-none focus:border-[#C9974A] transition-colors">
                                                            <option>Read-Only Operations</option>
                                                            <option>Full Table Write Access</option>
                                                            <option>absolute_admin</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <button className="bg-[#4E1414] hover:bg-[#350C0C] text-[#F6EEDF] border border-[#C9974A]/50 w-full p-4 rounded-xl font-bold transition-colors">
                                                    Deploy Role to Supabase Schema
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <RoleCard name="Master Admin" level="Full Absolute Access" active color="border-[#C9974A] bg-[#C9974A]/10" />
                                    <RoleCard name="Waiters / Captains" level="Orders & KOT Push" />
                                    <RoleCard name="Cashiers" level="Billing Finalization" />
                                    <RoleCard name="Kitchen Staff" level="KDS Pipeline Read/Write" />
                                </div>
                            </motion.div>
                        )}

                        {/* SETTINGS */}
                        {activeTab === 'Settings' && (
                            <motion.div key="settings" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#1E1510] rounded-2xl border border-[#C9974A]/20 p-8 space-y-8">
                                <div>
                                    <h3 className="font-bold text-xl text-[#F6EEDF] border-b border-[#C9974A]/20 pb-4 mb-6">Global Variables</h3>
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center bg-[#241B15] p-4 rounded-xl border border-[#C9974A]/10">
                                                <span className="text-sm font-semibold text-[#F6EEDF]/80">Allow Manual Table Overrides (Bypass QR)</span>
                                                <div className="w-12 h-6 bg-[#C9974A] rounded-full relative cursor-pointer"><div className="w-4 h-4 bg-[#241B15] rounded-full absolute right-1 top-1"></div></div>
                                            </div>
                                            <div className="flex justify-between items-center bg-[#241B15] p-4 rounded-xl border border-[#C9974A]/10">
                                                <span className="text-sm font-semibold text-[#F6EEDF]/80">Auto-Print KOT to Kitchen Printer</span>
                                                <div className="w-12 h-6 bg-[#4E1414] rounded-full relative cursor-pointer"><div className="w-4 h-4 bg-[#F6EEDF] rounded-full absolute left-1 top-1"></div></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}

function SidebarItem({ icon, label, isActive, onClick }: any) {
    return (
        <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-semibold ${isActive ? 'bg-[#4E1414] text-[#C9974A] border border-[#C9974A]/20 shadow-lg' : 'text-[#F6EEDF]/60 hover:bg-[#241B15] hover:text-[#C9974A]'}`}>
            <span className={isActive ? 'text-[#C9974A]' : ''}>{icon}</span>
            {label}
            {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
        </button>
    );
}

function KpiCard({ title, value, sub, accent }: any) {
    return (
        <div className={`p-6 rounded-2xl bg-[#1E1510] border ${accent} shadow-xl relative overflow-hidden flex flex-col justify-center`}>
            <h3 className="text-xs font-bold opacity-70 mb-2 uppercase tracking-widest text-[#C9974A]">{title}</h3>
            <div className="text-4xl font-black text-[#F6EEDF] font-display mb-1">{value}</div>
            {sub && <p className="text-[10px] text-[#F6EEDF]/50 font-bold uppercase tracking-wider">{sub}</p>}
            <Activity className="absolute right-0 bottom-0 w-32 h-32 opacity-[0.03] translate-x-4 translate-y-4 text-white" />
        </div>
    );
}

function RoleCard({ name, level, active, color }: any) {
    return (
        <div className={`bg-[#241B15] border ${color ? color : 'border-[#C9974A]/20'} p-6 rounded-2xl relative overflow-hidden group hover:border-[#C9974A] transition-colors cursor-pointer`}>
            <h3 className="font-bold font-display text-xl mb-1 text-[#F6EEDF]">{name}</h3>
            <p className="text-[#C9974A] text-[10px] font-black uppercase tracking-[0.2em] mb-6">{level}</p>
            <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-[#F6EEDF]/70 font-medium"><CheckSquare className="w-4 h-4 text-[#C9974A]" /> Core Framework Access</div>
                <div className="flex items-center gap-3 text-sm text-[#F6EEDF]/70 font-medium"><CheckSquare className="w-4 h-4 text-[#C9974A]" /> Operations Write Layer</div>
                {active && <div className="flex items-center gap-3 text-sm text-[#2DE0A5] font-bold"><CheckSquare className="w-4 h-4 text-[#2DE0A5]" /> Master Table Mutations</div>}
            </div>
        </div>
    );
}
