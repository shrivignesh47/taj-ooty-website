"use client";

import { motion } from 'framer-motion';
import { 
    X, Lock, Layers, LayoutGrid, ClipboardList, History, 
    BarChart3, ChefHat, User, Users, Activity, TrendingUp, 
    BookOpen, Settings, FileSpreadsheet 
} from 'lucide-react';

interface Props {
    isSidebarOpen: boolean;
    setIsSidebarOpen: (open: boolean) => void;
    hasPerm: (perm: string) => boolean;
    handleSidebarAction: (actionId: string, perm: string) => void;
}

export function BillingSidebar({
    isSidebarOpen,
    setIsSidebarOpen,
    hasPerm,
    handleSidebarAction
}: Props) {
    const sidebarItems = [
        { id: 'bento', label: 'Bento Dashboard Overview', icon: Layers, perm: 'view_billing' },
        { id: 'tables', label: 'Dine-In Floor Map Grid', icon: LayoutGrid, perm: 'view_orders' },
        { id: 'takeaway', label: 'Takeaway Counter Queue', icon: ClipboardList, perm: 'view_orders' },
        { id: 'history', label: 'Closed Invoices Archive', icon: History, perm: 'view_billing' },
        { id: 'reports', label: 'Sales Reports Summary', icon: BarChart3, perm: 'view_reports' },
        { id: 'Kitchen Tickets', label: 'Kitchen Tickets Queue', icon: ChefHat, perm: 'view_kitchen_queue' },
        { id: 'CRM Customers', label: 'Guests CRM Database', icon: User, perm: 'view_revenue' },
        { id: 'Staff Roster', label: 'Staff Roster Management', icon: Users, perm: 'manage_staff' },
        { id: 'Table Configuration', label: 'Physical Table Configuration', icon: LayoutGrid, perm: 'manage_tables' },
        { id: 'Drawer Session', label: 'Register Drawer Shift', icon: Activity, perm: 'manage_cash_drawer' },
        { id: 'Petty Expenses', label: 'Petty Cash Expenses', icon: TrendingUp, perm: 'manage_expenses' },
        { id: 'Stock Inventory', label: 'Menu Stock Availability', icon: BookOpen, perm: 'manage_inventory' },
        { id: 'GST Settings', label: 'GST Tax Configurations', icon: Settings, perm: 'manage_gst' },
        { id: 'Export', label: 'Export Data (Excel)', icon: FileSpreadsheet, perm: 'export_data' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            />

            <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="relative bg-white w-72 h-full shadow-2xl flex flex-col justify-between border-r border-[#C9974A]/30 z-10"
            >
                <div className="p-5 flex-1 flex flex-col overflow-y-auto taj-scrollbar">
                    <div className="flex justify-between items-center pb-4 border-b border-[#C9974A]/25 mb-4">
                        <h2 className="font-bold text-base flex items-center gap-2">
                            <Layers className="w-5 h-5 text-[#C9974A]" /> Operations Control
                        </h2>
                        <button onClick={() => setIsSidebarOpen(false)} className="p-1 text-gray-400 hover:text-[#4E1414]">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-1">
                        {sidebarItems.map((item, idx) => {
                            const allowed = hasPerm(item.perm);
                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleSidebarAction(item.id, item.perm)}
                                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all text-left
                                        ${allowed 
                                            ? 'text-[#4E1414] hover:bg-[#F6EEDF]/40' 
                                            : 'text-gray-400 opacity-60'}`}
                                >
                                    <span className="flex items-center gap-2.5">
                                        <item.icon className="w-4 h-4 text-[#C9974A]" />
                                        {item.label}
                                    </span>
                                    {!allowed && <Lock className="w-3.5 h-3.5 text-gray-400" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
