"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutGrid, Table as TableIcon, ShoppingBag, Globe, RefreshCw, LogOut, Search, Plus, Bell, ChevronDown, User, Layers, Printer, SlidersHorizontal, ShieldAlert, Sparkles,
    IndianRupee, ChefHat, BookOpen, Users, Activity,
    TrendingUp, History, BarChart3, Settings, FileSpreadsheet, Lock,
    Menu, CheckCircle2, Shield
} from 'lucide-react';
import { NotificationCenter } from '@/components/NotificationCenter';
import { fmt } from './utils';
import { MainView, ActiveStaffUser } from '../types';

interface Props {
    dayStats: { revenue: number; bills: number };
    refreshing: boolean;
    setRefreshing: (ref: boolean) => void;
    loadData: () => void;
    logoutStaff: (payload: FormData) => void;
    activeView: MainView;
    hasPerm: (perm: string) => boolean;
    handleSidebarAction: (actionId: string, perm: string) => void;
    triggerPermissionDenied?: (perm: string) => void;
    activeUser?: ActiveStaffUser;
    searchQuery?: string;
    setSearchQuery?: (q: string) => void;
    onNewOrder?: () => void;
    onOpenCustomize?: () => void;
    onOpenPrinterSetup?: () => void;
}

export function BillingHeader({
    dayStats,
    refreshing,
    setRefreshing,
    loadData,
    logoutStaff,
    activeView,
    hasPerm,
    handleSidebarAction,
    triggerPermissionDenied,
    activeUser,
    searchQuery = '',
    setSearchQuery,
    onNewOrder,
    onOpenCustomize,
    onOpenPrinterSetup
}: Props) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);

    // Close popovers on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsMenuOpen(false);
            }
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleItemClick = (id: string, perm: string) => {
        if (!hasPerm(perm)) {
            if (triggerPermissionDenied) {
                triggerPermissionDenied(perm);
            }
            setIsMenuOpen(false);
            return;
        }
        handleSidebarAction(id, perm);
        setIsMenuOpen(false);
    };

    // Micro Utility Row items: Icon over micro-label (Petpooja style)
    const microUtilities = [
        { id: 'bento', label: 'Overview', icon: Layers, perm: 'view_billing' },
        { id: 'tables', label: 'Floor', icon: LayoutGrid, perm: 'view_orders' },
        { id: 'takeaway', label: 'Takeaway', icon: ShoppingBag, perm: 'view_orders' },
        { id: 'online_orders', label: 'Online', icon: Globe, perm: 'view_orders' },
        { id: 'kitchen_tickets', label: 'Kitchen', icon: ChefHat, perm: 'view_kitchen_queue' },
    ];

    // Menu Groups for Hamburger / Logo Popover
    const menuGroups = [
        {
            category: 'POS Operations',
            items: [
                { id: 'bento', label: 'Dashboard Overview', icon: Layers, perm: 'view_billing' },
                { id: 'tables', label: 'Dine-In Floor Map', icon: LayoutGrid, perm: 'view_orders' },
                { id: 'takeaway', label: 'Takeaway Counter Queue', icon: ShoppingBag, perm: 'view_orders' },
                { id: 'online_orders', label: 'Online Delivery (Swiggy/Zomato)', icon: Globe, perm: 'view_orders' },
                { id: 'kitchen_tickets', label: 'Kitchen Tickets Queue', icon: ChefHat, perm: 'view_kitchen_queue' },
                { id: 'stock_inventory', label: 'Menu Stock Availability', icon: BookOpen, perm: 'edit_menu' },
            ]
        },
        {
            category: 'Management & Shifts',
            items: [
                { id: 'Drawer Session', label: 'Register Drawer Shift', icon: Activity, perm: 'view_billing' },
                { id: 'Petty Expenses', label: 'Petty Cash Expenses', icon: TrendingUp, perm: 'view_billing' },
                { id: 'staff_roster', label: 'Staff Roster Management', icon: Users, perm: 'manage_staff' },
            ]
        },
        {
            category: 'Analytics & Settings',
            items: [
                { id: 'history', label: 'Closed Invoices Archive', icon: History, perm: 'view_billing' },
                { id: 'reports', label: 'Sales Reports Summary', icon: BarChart3, perm: 'view_reports' },
                { id: 'crm_customers', label: 'Guests CRM Database', icon: User, perm: 'view_revenue' },
                { id: 'table_config', label: 'Physical Table Setup', icon: LayoutGrid, perm: 'manage_tables' },
                { id: 'gst_settings', label: 'GST Tax Configuration', icon: Settings, perm: 'manage_gst' },
                { id: 'Export', label: 'Export Data (Excel)', icon: FileSpreadsheet, perm: 'export_data' },
            ]
        }
    ];

    return (
        <header className="bg-[#4E1414] text-[#F6EEDF] h-14 px-3 sm:px-5 shadow-md sticky top-0 z-40 border-b border-[#C9974A]/30 flex items-center justify-between gap-2.5">
            
            {/* Left Section: [☰] Hamburger + Logo + Wordmark */}
            <div className="flex items-center gap-2 shrink-0 relative" ref={menuRef}>
                <button
                    onClick={() => setIsMenuOpen(prev => !prev)}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[#C9974A] border border-[#C9974A]/30 transition-all cursor-pointer flex items-center gap-1.5"
                    title="Open Full Navigation Menu"
                >
                    <Menu className="w-4 h-4" />
                    <div className="w-5 h-5 bg-[#C9974A] rounded flex items-center justify-center shrink-0">
                        <IndianRupee className="w-3.5 h-3.5 text-[#4E1414] font-black" />
                    </div>
                    <span className="font-bold text-xs sm:text-sm font-display text-[#F6EEDF] whitespace-nowrap">
                        Taj POS
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-[#C9974A] transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Popover Menu Dropdown */}
                <AnimatePresence>
                    {isMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 6, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 6, scale: 0.98 }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                            className="absolute top-full left-0 mt-2 w-80 sm:w-96 bg-[#F6EEDF] rounded-2xl shadow-2xl border border-[#C9974A]/40 overflow-hidden z-50 text-[#4E1414]"
                        >
                            <div className="bg-[#4E1414] text-[#F6EEDF] px-4 py-2.5 flex justify-between items-center border-b border-[#C9974A]/30">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 bg-[#C9974A] rounded flex items-center justify-center">
                                        <IndianRupee className="w-3 h-3 text-[#4E1414]" />
                                    </div>
                                    <span className="font-bold text-xs uppercase tracking-wider">Hotel Taj Ooty — Modules</span>
                                </div>
                                <span className="text-[10px] text-[#C9974A] font-bold">Select View</span>
                            </div>

                            <div className="p-3 max-h-[70vh] overflow-y-auto space-y-3.5 taj-scrollbar">
                                {menuGroups.map(group => (
                                    <div key={group.category} className="space-y-1">
                                        <div className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#4E1414]/60 border-b border-[#C9974A]/20">
                                            {group.category}
                                        </div>
                                        <div className="grid grid-cols-1 gap-1 pt-1">
                                            {group.items.map(item => {
                                                const allowed = hasPerm(item.perm);
                                                const isActive = activeView === item.id;
                                                const ItemIcon = item.icon;

                                                return (
                                                    <button
                                                        key={item.id}
                                                        onClick={() => handleItemClick(item.id, item.perm)}
                                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all text-left cursor-pointer whitespace-nowrap
                                                            ${isActive
                                                                ? 'bg-[#4E1414] text-[#F6EEDF] font-bold shadow-xs'
                                                                : allowed
                                                                    ? 'bg-white hover:bg-[#C9974A]/15 text-[#4E1414] font-bold border border-stone-200/60'
                                                                    : 'bg-stone-100/70 text-stone-400 font-semibold border border-transparent'}`}
                                                    >
                                                        <div className="flex items-center gap-2.5">
                                                            <ItemIcon className={`w-4 h-4 ${isActive ? 'text-[#C9974A]' : allowed ? 'text-[#C9974A]' : 'text-stone-400'}`} />
                                                            <span>{item.label}</span>
                                                        </div>

                                                        {isActive && (
                                                            <span className="w-2 h-2 rounded-full bg-[#C9974A] animate-pulse" />
                                                        )}
                                                        {!allowed && (
                                                            <Lock className="w-3.5 h-3.5 text-stone-400" />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Primary Action Button [+ New Order] + Compact Search Input */}
            <div className="flex items-center gap-2 min-w-0 flex-1 max-w-xs sm:max-w-md">
                <button
                    onClick={() => {
                        if (onNewOrder) onNewOrder();
                        else handleItemClick('takeaway', 'view_orders');
                    }}
                    className="bg-[#C9974A] hover:bg-[#b58338] text-[#4E1414] font-black px-2.5 sm:px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shrink-0 shadow-sm transition-all cursor-pointer whitespace-nowrap"
                    title="Create New Order / Takeaway"
                >
                    <Plus className="w-4 h-4 font-black stroke-[3]" />
                    <span className="hidden xs:inline">New Order</span>
                </button>

                <div className="relative flex-1 min-w-0">
                    <Search className="w-3.5 h-3.5 text-[#F6EEDF]/50 absolute left-2.5 top-2.5" />
                    <input
                        type="text"
                        placeholder="Search table/bill..."
                        value={searchQuery}
                        onChange={e => setSearchQuery && setSearchQuery(e.target.value)}
                        className="w-full bg-white/10 border border-white/20 rounded-xl pl-8 pr-3 py-1 text-xs font-semibold text-[#F6EEDF] placeholder-[#F6EEDF]/40 outline-none focus:bg-white/20 focus:border-[#C9974A] transition-all"
                    />
                </div>
            </div>

            {/* Micro Utility Icon Row (Icon OVER Micro-label, NO heavy button chrome) */}
            <nav className="hidden md:flex items-center gap-3 sm:gap-4 border-l border-r border-[#C9974A]/20 px-3 shrink-0">
                {microUtilities.map(item => {
                    const isActive = activeView === item.id;
                    const allowed = hasPerm(item.perm);
                    const ItemIcon = item.icon;

                    return (
                        <button
                            key={item.id}
                            onClick={() => handleItemClick(item.id, item.perm)}
                            className={`flex flex-col items-center justify-center cursor-pointer transition-all group whitespace-nowrap py-0.5 px-1 rounded-md
                                ${isActive ? 'text-[#C9974A]' : allowed ? 'text-[#F6EEDF]/80 hover:text-white' : 'text-white/30'}`}
                            title={!allowed ? 'Permission required' : item.label}
                        >
                            <ItemIcon className={`w-4 h-4 ${isActive ? 'text-[#C9974A]' : 'group-hover:scale-110 transition-transform'}`} />
                            <span className={`text-[10px] font-bold tracking-tight mt-0.5 leading-none ${isActive ? 'text-[#C9974A] font-black' : ''}`}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}

                <button
                    onClick={() => { setRefreshing(true); loadData(); }}
                    className="flex flex-col items-center justify-center cursor-pointer text-[#F6EEDF]/80 hover:text-white transition-all py-0.5 px-1"
                    title="Sync POS Data"
                >
                    <RefreshCw className={`w-4 h-4 text-[#C9974A] ${refreshing ? 'animate-spin' : ''}`} />
                    <span className="text-[10px] font-bold tracking-tight mt-0.5 leading-none">Sync</span>
                </button>
            </nav>

            {/* Far Right: Notification Center + Staff Profile Pill */}
            <div className="flex items-center gap-2 shrink-0">
                {/* Notification Center */}
                <NotificationCenter currentStaffId={activeUser?.id} currentRoleName={activeUser?.roleName} />

                {/* Staff Profile Pill & Popover Menu */}
                <div className="relative" ref={profileRef}>
                    <button
                        onClick={() => setIsProfileOpen(prev => !prev)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-[#F6EEDF] text-xs font-bold transition-all cursor-pointer"
                    >
                        <User className="w-3.5 h-3.5 text-[#C9974A]" />
                        <span className="hidden sm:inline max-w-[100px] truncate">{activeUser?.name || 'Cashier Desk'}</span>
                        <ChevronDown className="w-3 h-3 text-[#C9974A]" />
                    </button>

                    <AnimatePresence>
                        {isProfileOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                                transition={{ duration: 0.15 }}
                                className="absolute top-full right-0 mt-2 w-64 bg-white text-[#4E1414] rounded-2xl shadow-2xl border border-[#C9974A]/40 p-3 space-y-3 z-50"
                            >
                                <div className="pb-2 border-b border-gray-100">
                                    <p className="font-extrabold text-xs text-[#4E1414]">{activeUser?.name || 'Cashier Desk'}</p>
                                    <p className="text-[10px] text-[#C9974A] font-bold uppercase tracking-wider">{activeUser?.roleName || 'Cashier'}</p>
                                </div>

                                <div className="bg-[#F6EEDF]/40 p-2.5 rounded-xl border border-[#C9974A]/20 text-xs space-y-1">
                                    <div className="flex justify-between text-[#4E1414]/70 font-semibold text-[11px]">
                                        <span>Today's Sales:</span>
                                        <b className="text-[#4E1414] font-bold">{fmt(dayStats.revenue)}</b>
                                    </div>
                                    <div className="flex justify-between text-[#4E1414]/70 font-semibold text-[11px]">
                                        <span>Billed Checkouts:</span>
                                        <b className="text-[#4E1414] font-bold">{dayStats.bills}</b>
                                    </div>
                                </div>

                                <div className="space-y-1 pt-1">
                                    {onOpenCustomize && (
                                        <button
                                            onClick={() => { onOpenCustomize(); setIsProfileOpen(false); }}
                                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold hover:bg-[#F6EEDF]/50 transition-colors text-left cursor-pointer"
                                        >
                                            <SlidersHorizontal className="w-3.5 h-3.5 text-[#C9974A]" /> Customize Layout
                                        </button>
                                    )}
                                    {onOpenPrinterSetup && (
                                        <button
                                            onClick={() => { onOpenPrinterSetup(); setIsProfileOpen(false); }}
                                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold hover:bg-[#F6EEDF]/50 transition-colors text-left cursor-pointer"
                                        >
                                            <Printer className="w-3.5 h-3.5 text-[#C9974A]" /> Printer Settings
                                        </button>
                                    )}
                                </div>

                                <div className="pt-2 border-t border-gray-100">
                                    <form action={logoutStaff}>
                                        <button
                                            type="submit"
                                            className="w-full bg-[#4E1414] hover:bg-[#380e0e] text-[#F6EEDF] font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                        >
                                            <LogOut className="w-3.5 h-3.5 text-[#C9974A]" /> Sign Out
                                        </button>
                                    </form>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </header>
    );
}
