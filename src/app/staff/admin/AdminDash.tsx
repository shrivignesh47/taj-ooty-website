/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, TrendingUp, ShieldCheck, Activity, LogOut, LayoutGrid, BookOpen, Settings, ClipboardList } from 'lucide-react';
import { logoutStaff } from '@/features/ordering/actions/auth';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { supabase } from '@/features/ordering/lib/supabase';

import { fetchAdminDashboardData } from '@/features/ordering/actions/fetchAdminStats';
import { AdminOverview } from './components/AdminOverview';
import { AdminTablesLive } from './components/AdminTablesLive';
import { AdminMenuSync } from './components/AdminMenuSync';
import { AdminCRM } from './components/AdminCRM';
import { AdminOrders } from './components/AdminOrders';
import { AdminActivityLog } from './components/AdminActivityLog';
import { AdminStaff } from './components/AdminStaff';
import { AdminRoles } from './components/AdminRoles';
import { AdminAnalytics } from './components/AdminAnalytics';
import { AdminSettings } from './components/AdminSettings';
import { AdminExport } from './components/AdminExport';

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const NAV_TABS = [
    { id: 'Overview', label: 'Overview', icon: <Activity className="w-4 h-4" /> },
    { id: 'Orders', label: 'Orders', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'Tables', label: 'Tables', icon: <LayoutGrid className="w-4 h-4" /> },
    { id: 'Menu', label: 'Menu', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'Staff', label: 'Staff', icon: <Users className="w-4 h-4" /> },
    { id: 'Roles', label: 'Roles', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'Customers', label: 'Customers', icon: <Users className="w-4 h-4" /> },
    { id: 'Analytics', label: 'Analytics', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'Export', label: 'Export', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'Activity', label: 'Activity Log', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'Settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
];

export function AdminDash() {
    const [metrics, setMetrics] = useState({ revenue: 0, totalOrders: 0, activeTables: 0, monthlyVisits: 0 });
    const [staff, setStaff] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [permissions, setPermissions] = useState<any[]>([]);
    const [menu, setMenu] = useState<any[]>([]);
    const [tables, setTables] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [activeUser, setActiveUser] = useState<any>(null);
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

        const { tables: tableData, orders: allOrders, staff: staffData, menu: menuData, roles: rolesData, permissions: permsData } = result as any;

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
        if (allOrders) setOrders(allOrders);
        if (result.activeUser) setActiveUser(result.activeUser);
        if (staffData) setStaff(staffData);
        if (menuData) setMenu(menuData);
        if (rolesData) setRoles(rolesData);
        if (permsData) setPermissions(permsData);
        setLoading(false);
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchData();
        const interval = setInterval(fetchData, 30000); // Poll less frequently since we have realtime updates

        const channel = supabase
            .channel('admin-realtime-dashboard')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'orders' },
                () => {
                    fetchData();
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'order_items' },
                () => {
                    fetchData();
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'order_status_history' },
                () => {
                    fetchData();
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'roles' },
                () => {
                    fetchData();
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'role_permissions' },
                () => {
                    fetchData();
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'permissions' },
                () => {
                    fetchData();
                }
            )
            .subscribe();

        return () => {
            clearInterval(interval);
            supabase.removeChannel(channel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchData]);

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

        // Reset the input value so the same file triggers onChange again
        e.target.value = null;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            const wb = XLSX.read(evt.target?.result, { type: 'binary' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(ws);

            // Build bulk array payload dynamically matching different header styles
            const payload = data.map((d: any) => {
                const norm = Object.keys(d).reduce((acc, key) => {
                    acc[key.toLowerCase().replace(/[^a-z0-9]/g, '')] = d[key];
                    return acc;
                }, {} as any);

                const rawPrice = norm.price || norm.cost || norm.rate || '0';
                const cleanPrice = typeof rawPrice === 'string' ? rawPrice.replace(/[^0-9.]/g, '') : rawPrice;

                return {
                    name: norm.name || norm.itemname || norm.title || norm.item || 'Imported Item',
                    price: parseFloat(cleanPrice) || 0,
                    category: norm.category || norm.type || norm.group || 'General'
                };
            });

            // Force visual sync before server request finishes
            setMenu(prev => [
                ...payload.map((p, i) => ({ id: `mock-${i}`, name: p.name, price: p.price, categories: { name: p.category } })),
                ...prev
            ]);

            const { bulkAddMenuItems } = await import('@/features/ordering/actions/adminActions');
            const res = await bulkAddMenuItems(payload);

            if (!res.success) {
                alert(`Upload failed: ${res.error}\n\nPlease check your excel formatting (prices must be numbers)`);
                // Revert optimistic UI
                fetchData();
                return;
            }

            // Re-fetch genuine ids from DB
            fetchData();
            alert('Upload Complete!');
        };
        reader.readAsBinaryString(file);
    };

    const hasPerm = useCallback((requiredPerm: string) => {
        if (!activeUser) return false;
        // Admin role always has full access to all admin tabs
        if (activeUser.roleName?.toLowerCase() === 'admin') return true;
        return activeUser.permissions?.includes(requiredPerm) ?? false;
    }, [activeUser]);

    const permittedTabs = useMemo(() => NAV_TABS.filter(t => {
        switch (t.id) {
            // Fallback to manage_staff for keys that may not exist in the permissions table
            case 'Overview':  return hasPerm('view_dashboard')  || hasPerm('manage_staff') || hasPerm('view_revenue');
            case 'Orders':    return hasPerm('manage_orders')   || hasPerm('view_orders')  || hasPerm('view_revenue') || hasPerm('manage_staff');
            case 'Tables':    return hasPerm('manage_orders')   || hasPerm('manage_tables')|| hasPerm('manage_staff');
            case 'Menu':      return hasPerm('edit_menu');
            case 'Staff':     return hasPerm('manage_staff');
            case 'Roles':     return hasPerm('manage_roles');
            case 'Customers': return hasPerm('view_revenue')    || hasPerm('manage_staff');
            case 'Analytics': return hasPerm('view_revenue')    || hasPerm('manage_staff');
            case 'Activity':  return hasPerm('view_activity_log')|| hasPerm('manage_staff');
            case 'Export':    return hasPerm('view_revenue')    || hasPerm('manage_staff');
            case 'Settings':  return hasPerm('manage_staff')    || hasPerm('manage_roles');
            default:          return true;
        }
    }), [hasPerm]);

    useEffect(() => {
        if (!loading && permittedTabs.length > 0 && !permittedTabs.find(t => t.id === activeTab)) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setActiveTab(permittedTabs[0].id);
        }
    }, [permittedTabs, activeTab, loading]);

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
                    {permittedTabs.map(tab => (
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

                <div className="p-3 border-t border-[#C9974A]/20 space-y-1.5">
                    <Link href="/staff/dashboard" className="w-full flex items-center justify-center gap-2 p-3 text-[#F6EEDF]/80 hover:text-[#4E1414] hover:bg-[#C9974A] rounded-xl font-bold text-xs uppercase tracking-wider transition-all bg-[#350C0C]/50 border border-[#C9974A]/30">
                        ← Stations Hub
                    </Link>
                    <form action={logoutStaff}>
                        <button type="submit" className="w-full flex items-center justify-center gap-2 p-3 text-[#F6EEDF]/60 hover:text-[#4E1414] hover:bg-[#F6EEDF] rounded-xl font-bold transition-all">
                            <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                    </form>
                </div>
            </aside>

            {/* ── Main ── */}
            <main className="flex-1 overflow-y-auto bg-[#F6EEDF] taj-scrollbar">
                {/* Header */}
                <header className="sticky top-0 z-40 bg-[#350C0C] border-b border-[#C9974A]/20 px-8 py-4 flex justify-between items-center shadow-md">
                    <div>
                        <h2 className="text-xl font-black text-[#F6EEDF] tracking-tight">
                            {permittedTabs.find(t => t.id === activeTab)?.label ?? activeTab}
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
                                <AdminOrders orders={orders} onRefresh={fetchData} />
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
                                <AdminCRM customers={customers} orders={orders} />
                            </motion.div>
                        )}

                        {activeTab === 'Staff' && (
                            <motion.div key="staff" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                                <AdminStaff staff={staff} roles={roles} onStaffUpdated={fetchData} />
                            </motion.div>
                        )}

                        {activeTab === 'Roles' && (
                            <motion.div key="roles" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                                <AdminRoles roles={roles} staff={staff} permissions={permissions} onRolesUpdated={fetchData} />
                            </motion.div>
                        )}

                        {activeTab === 'Activity' && (
                            <motion.div key="act" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                                <AdminActivityLog />
                            </motion.div>
                        )}

                        {activeTab === 'Analytics' && (
                            <motion.div key="analytics" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                                <AdminAnalytics menu={menu} orders={orders} />
                            </motion.div>
                        )}

                        {activeTab === 'Settings' && (
                            <motion.div key="sets" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                                <AdminSettings />
                            </motion.div>
                        )}
                        {activeTab === 'Export' && (
                            <motion.div key="export" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                                <AdminExport
                                    orders={orders}
                                    menu={menu}
                                    staff={staff}
                                    customers={customers}
                                />
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
