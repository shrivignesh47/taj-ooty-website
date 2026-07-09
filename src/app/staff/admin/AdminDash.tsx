/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, TrendingUp, ShieldCheck, Activity, LogOut, LayoutGrid, BookOpen, Settings, ClipboardList } from 'lucide-react';
import { logoutStaff } from '@/features/ordering/actions/auth';
import * as XLSX from 'xlsx';

import { fetchAdminDashboardData } from '@/features/ordering/actions/fetchAdminStats';
import { AdminOverview } from './components/AdminOverview';
import { AdminTablesLive } from './components/AdminTablesLive';
import { AdminMenuSync } from './components/AdminMenuSync';
import { AdminCRM } from './components/AdminCRM';
import { AdminOrders } from './components/AdminOrders';
import { AdminActivityLog } from './components/AdminActivityLog';

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const NAV_TABS = [
    { id: 'Overview', label: 'Dashboard', icon: <Activity className="w-4 h-4" /> },
    { id: 'Orders', label: 'Orders', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'Tables', label: 'Tables', icon: <LayoutGrid className="w-4 h-4" /> },
    { id: 'Menu', label: 'Menu', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'Customers', label: 'Customers', icon: <Users className="w-4 h-4" /> },
    { id: 'Roles', label: 'Staff', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'Activity', label: 'Activity Log', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'Settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
];

export function AdminDash() {
    const [metrics, setMetrics] = useState({ revenue: 0, totalOrders: 0, activeTables: 0, monthlyVisits: 0 });
    const [staff, setStaff] = useState<any[]>([]);
    const [menu, setMenu] = useState<any[]>([]);
    const [tables, setTables] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('Overview');

    // Menu edit state
    const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ name: '', price: 0, category: '' });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchData = useCallback(async () => {
        const result = await fetchAdminDashboardData();
        if (!result.success) {
            setFetchError(result.error as string);
            setLoading(false);
            return;
        }

        const { tables: tableData, orders: allOrders, staff: staffData, menu: menuData } = result;

        let rev = 0, active = 0, thisMonth = 0;
        const custMap = new Map<string, any>();
        const tableStatusMap = new Map<string, any>();

        if (allOrders?.length) {
            const now = new Date();
            allOrders.forEach((o: any) => {
                const orderTotal = o.order_items?.reduce((s: number, i: any) => s + i.price_at_order * i.qty, 0) ?? 0;
                if (['billed', 'served'].includes(o.status)) rev += orderTotal;
                if (['pending', 'confirmed', 'preparing', 'ready', 'served'].includes(o.status)) {
                    active++;
                    if (o.table_id) {
                        if (!tableStatusMap.has(o.table_id)) {
                            tableStatusMap.set(o.table_id, { currentBill: orderTotal, customers: o.customer_name, pax: o.guest_count ?? 4 });
                        } else {
                            tableStatusMap.get(o.table_id).currentBill += orderTotal;
                        }
                    }
                }
                const oDate = new Date(o.created_at);
                if (oDate.getMonth() === now.getMonth() && oDate.getFullYear() === now.getFullYear()) thisMonth++;
                if (o.customer_phone) {
                    const ex = custMap.get(o.customer_phone);
                    if (!ex) custMap.set(o.customer_phone, { name: o.customer_name, phone: o.customer_phone, visits: 1, totalSpent: orderTotal, lastVisit: o.created_at });
                    else { ex.visits++; ex.totalSpent += orderTotal; }
                }
            });

            setCustomers(Array.from(custMap.values()).sort((a: any, b: any) => b.totalSpent - a.totalSpent));
            setMetrics({ revenue: rev, totalOrders: allOrders.length, activeTables: active, monthlyVisits: thisMonth });
        }

        if (tableData) {
            setTables(tableData.map((t: any) => {
                const live = tableStatusMap.get(t.id);
                return { ...t, status: live ? 'Occupied' : 'Available', currentBill: live?.currentBill ?? 0, pax: live?.pax ?? 4, customers: live?.customers ?? null };
            }));
        }
        if (staffData) setStaff(staffData);
        if (menuData) setMenu(menuData);
        setLoading(false);
    }, []);

    useEffect(() => {
        // eslint-disable-next-line
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Menu handlers
    const handleDeleteMenu = (id: string) => setMenu(m => m.filter(x => x.id !== id));
    const handleStartEdit = (m: any) => {
        setEditingMenuId(m.id ?? null);
        if (m.id) setEditForm({ name: m.name, price: m.price, category: m.categories?.name ?? '' });
    };
    const handleSaveEdit = (id: string) => {
        setMenu(m => m.map(x => x.id === id ? { ...x, name: editForm.name, price: editForm.price, categories: { name: editForm.category } } : x));
        setEditingMenuId(null);
    };
    const handleFileUpload = (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            const wb = XLSX.read(evt.target?.result, { type: 'binary' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(ws);

            // Build bulk array payload
            const payload = data.map((d: any) => ({
                name: d.Name || d.name || 'Imported Item',
                price: parseFloat(d.Price || d.price || '0'),
                category: d.Category || d.category || 'Special Imports'
            }));

            // Force visual sync before server request finishes
            setMenu(prev => [
                ...payload.map((p, i) => ({ id: `mock-${i}`, name: p.name, price: p.price, categories: { name: p.category } })),
                ...prev
            ]);

            const { bulkAddMenuItems } = await import('@/features/ordering/actions/adminActions');
            await bulkAddMenuItems(payload);

            // Re-fetch genuine ids from DB
            fetchData();
            alert('Upload Complete!');
        };
        reader.readAsBinaryString(file);
    };

    if (loading) return (
        <div className="text-center text-[#4E1414] py-40 h-screen bg-[#F6EEDF] flex flex-col items-center justify-center">
            <Activity className="w-10 h-10 animate-pulse mb-4 text-[#C9974A]" />
            <p className="font-bold text-lg tracking-wide">Loading Dashboard…</p>
        </div>
    );
    if (fetchError) return (
        <div className="text-center py-40 h-screen bg-[#F6EEDF] flex flex-col items-center justify-center">
            <p className="font-black text-[#4E1414] text-2xl mb-2">Data Error</p>
            <p className="text-[#241B15]/60">{fetchError}</p>
        </div>
    );

    const revenueChartData = [
        { name: 'Jan', uv: 100 }, { name: 'Feb', uv: 150 }, { name: 'Mar', uv: 120 }, { name: 'Apr', uv: 250 },
        { name: 'May', uv: 200 }, { name: 'Jun', uv: 300 }, { name: 'Jul', uv: 400 }, { name: 'Aug', uv: 380 }
    ];
    const ticketTypes = [{ name: 'Pending', value: 45 }, { name: 'Completed', value: 75 }];
    const occupiedCount = tables.filter(t => t.status === 'Occupied').length;

    return (
        <div className="flex h-screen text-[#241B15] font-sans overflow-hidden fixed inset-0 w-full z-50">
            {/* ── Sidebar ── */}
            <aside className="w-60 bg-[#4E1414] border-r border-[#C9974A]/20 hidden lg:flex flex-col shadow-lg relative z-20">
                <div className="p-7 pb-4 border-b border-[#C9974A]/20">
                    <h1 className="text-2xl font-black text-[#F6EEDF] leading-tight">Taj Admin</h1>
                    <p className="text-[10px] text-[#C9974A] mt-1 uppercase tracking-[0.2em] font-bold">Restaurant Manager</p>
                </div>

                <nav className="flex-grow px-3 py-4 space-y-1 overflow-y-auto taj-scrollbar">
                    {NAV_TABS.map(tab => (
                        <SidebarItem
                            key={tab.id}
                            icon={tab.icon}
                            label={tab.label}
                            isActive={activeTab === tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            activeBadge={tab.id === 'Tables' ? occupiedCount : undefined}
                        />
                    ))}
                </nav>

                <div className="p-3 border-t border-[#C9974A]/20">
                    <form action={logoutStaff}>
                        <button type="submit" className="w-full flex items-center justify-center gap-2 p-3 text-[#F6EEDF]/60 hover:text-[#4E1414] hover:bg-[#F6EEDF] rounded-xl font-bold transition-all">
                            <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                    </form>
                </div>
            </aside>

            {/* ── Main ── */}
            <main className="flex-1 overflow-y-auto bg-[#F6EEDF]/50 taj-scrollbar">
                {/* Header */}
                <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#C9974A]/20 px-8 py-4 flex justify-between items-center shadow-sm">
                    <div>
                        <h2 className="text-xl font-black text-[#4E1414] tracking-tight">
                            {NAV_TABS.find(t => t.id === activeTab)?.label ?? activeTab}
                        </h2>
                        <p className="text-[#C9974A] text-xs font-semibold tracking-wide">Hotel Taj Ooty</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Live data" />
                        <div className="bg-[#F6EEDF] border border-[#C9974A]/30 px-4 py-2 rounded-full text-sm font-bold text-[#4E1414] flex items-center gap-2">
                            <UserIcon /> Admin
                        </div>
                    </div>
                </header>

                <div className="p-6 md:p-8 max-w-[1600px] mx-auto">
                    <AnimatePresence mode="wait">

                        {activeTab === 'Overview' && (
                            <motion.div key="ov" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                                <AdminOverview metrics={metrics} ticketTypes={ticketTypes} revenueChartData={revenueChartData} totalOrders={metrics.totalOrders} />
                            </motion.div>
                        )}

                        {activeTab === 'Orders' && (
                            <motion.div key="ord" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                                <AdminOrders />
                            </motion.div>
                        )}

                        {activeTab === 'Tables' && (
                            <motion.div key="tbl" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                                <AdminTablesLive />
                            </motion.div>
                        )}

                        {activeTab === 'Menu' && (
                            <motion.div key="mnu" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                                <AdminMenuSync
                                    menu={menu}
                                    editingMenuId={editingMenuId}
                                    editForm={editForm}
                                    fileInputRef={fileInputRef}
                                    handleFileUpload={handleFileUpload}
                                    handleStartEdit={handleStartEdit}
                                    handleSaveEdit={handleSaveEdit}
                                    handleDeleteMenu={handleDeleteMenu}
                                    setEditForm={setEditForm}
                                    onMenuUpdated={fetchData}
                                />
                            </motion.div>
                        )}

                        {activeTab === 'Customers' && (
                            <motion.div key="crm" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                                <AdminCRM customers={customers} />
                            </motion.div>
                        )}

                        {activeTab === 'Roles' && (
                            <motion.div key="roles" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {staff.length === 0 && (
                                    <p className="col-span-full text-center text-[#4E1414]/50 font-semibold py-20">No staff members found.</p>
                                )}
                                {staff.map(s => (
                                    <div key={s.id} className="bg-white p-6 rounded-2xl shadow-sm border border-[#C9974A]/20 flex flex-col justify-between min-h-[140px] hover:border-[#C9974A]/50 transition-colors">
                                        <div className="flex gap-4 items-center">
                                            <div className="w-12 h-12 bg-[#4E1414] text-[#F6EEDF] rounded-xl flex items-center justify-center font-black text-lg">
                                                {s.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-[#241B15]">{s.name}</h4>
                                                <span className="text-xs font-bold text-[#C9974A] uppercase tracking-wider">{s.roles?.name}</span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-[#241B15]/40 font-medium mt-4">{s.phone ?? 'No phone listed'}</p>
                                    </div>
                                ))}
                            </motion.div>
                        )}

                        {activeTab === 'Activity' && (
                            <motion.div key="act" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                                <AdminActivityLog />
                            </motion.div>
                        )}

                        {activeTab === 'Settings' && (
                            <motion.div key="sets" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-6 max-w-2xl">
                                <div className="bg-white rounded-2xl shadow-sm border border-[#C9974A]/20 overflow-hidden">
                                    <div className="bg-[#4E1414] px-6 py-4">
                                        <h3 className="font-bold text-[#F6EEDF]">Business & GST Details</h3>
                                        <p className="text-xs text-[#C9974A] mt-0.5">These appear on printed bills and tax documents</p>
                                    </div>
                                    <div className="p-6 grid grid-cols-1 gap-5">
                                        {[
                                            { label: 'Restaurant Name', defaultVal: 'Hotel Taj Ooty' },
                                            { label: 'GST Number', defaultVal: '33AACCH4620F1ZX' },
                                            { label: 'FSSAI License', defaultVal: '12419014000326' },
                                            { label: 'Address Line 1', defaultVal: '74/75, Collector Rd, Charing Cross' },
                                            { label: 'City & PIN', defaultVal: 'Ooty, Tamil Nadu – 643001' },
                                            { label: 'Phone', defaultVal: '+91 99999 00000' },
                                        ].map(f => (
                                            <div key={f.label} className="space-y-1.5">
                                                <label className="text-xs font-bold text-[#4E1414] uppercase tracking-widest">{f.label}</label>
                                                <input
                                                    type="text"
                                                    defaultValue={f.defaultVal}
                                                    className="w-full border border-[#C9974A]/30 rounded-xl px-4 py-3 font-bold text-[#241B15] bg-[#F6EEDF]/60 focus:outline-none focus:border-[#C9974A] transition-colors"
                                                />
                                            </div>
                                        ))}
                                        <button className="bg-[#4E1414] text-[#F6EEDF] px-6 py-3 rounded-xl font-bold hover:bg-[#350C0C] transition-colors w-fit border border-[#C9974A]/30">
                                            Save Changes
                                        </button>
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

// ─── Sub-components ──────────────────────────────────────────────────────────

function SidebarItem({ icon, label, isActive, onClick, activeBadge }: {
    icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void; activeBadge?: number;
}) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all font-bold group
                ${isActive
                    ? 'bg-[#C9974A] text-[#4E1414] shadow'
                    : 'text-[#F6EEDF]/70 hover:bg-[#F6EEDF]/10 hover:text-[#F6EEDF]'
                }`}
        >
            <div className="flex items-center gap-2.5 text-sm">
                <span className={isActive ? 'text-[#4E1414]' : 'text-[#C9974A]/60 group-hover:text-[#C9974A]'}>{icon}</span>
                {label}
            </div>
            {activeBadge !== undefined && activeBadge > 0 && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isActive ? 'bg-[#4E1414] text-[#F6EEDF]' : 'bg-[#C9974A] text-[#4E1414]'}`}>
                    {activeBadge}
                </span>
            )}
        </button>
    );
}

function UserIcon() {
    return (
        <div className="w-6 h-6 rounded-full bg-[#4E1414] text-[#C9974A] flex items-center justify-center font-bold text-[10px] border border-[#C9974A]/40">AD</div>
    );
}
