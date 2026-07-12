"use client";

import { Menu, IndianRupee, RefreshCw, LogOut } from 'lucide-react';
import { fmt } from './utils';

interface Props {
    dayStats: { revenue: number; bills: number };
    refreshing: boolean;
    setIsSidebarOpen: (open: boolean) => void;
    setRefreshing: (ref: boolean) => void;
    loadData: () => void;
    logoutStaff: (payload: FormData) => void;
}

export function BillingHeader({
    dayStats,
    refreshing,
    setIsSidebarOpen,
    setRefreshing,
    loadData,
    logoutStaff
}: Props) {
    return (
        <header className="bg-[#4E1414] text-[#F6EEDF] px-6 py-4 shadow-md sticky top-0 z-30 border-b border-[#C9974A]/30">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-[#C9974A]"
                        title="Operations Navigation Drawer"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    
                    <div className="w-8 h-8 bg-[#C9974A] rounded-lg flex items-center justify-center">
                        <IndianRupee className="w-4 h-4 text-[#4E1414]" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-sm tracking-wider font-display">Taj POS Desk</span>
                            <span className="bg-[#C9974A] text-[#4E1414] text-[9px] font-black uppercase px-2 py-0.5 rounded">ONLINE</span>
                        </div>
                    </div>
                </div>

                {/* Header stats & actions */}
                <div className="flex items-center gap-4">
                    <div className="hidden lg:flex gap-6 text-[11px] font-black uppercase tracking-wider text-[#C9974A]/80">
                        <span>Register Revenue: <b className="text-[#F6EEDF]">{fmt(dayStats.revenue)}</b></span>
                        <span>Billed checkouts: <b className="text-[#F6EEDF]">{dayStats.bills}</b></span>
                    </div>

                    <button
                        onClick={() => { setRefreshing(true); loadData(); }}
                        className={`p-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#C9974A] transition-all ${refreshing ? 'animate-spin' : ''}`}
                        title="Sync POS Data"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>

                    <form action={logoutStaff}>
                        <button type="submit" className="flex items-center gap-1.5 bg-[#F6EEDF]/10 hover:bg-[#F6EEDF]/20 border border-[#F6EEDF]/20 text-[#F6EEDF] font-bold px-3 py-2 rounded-xl text-xs transition-all">
                            <LogOut className="w-3.5 h-3.5" /> Sign Out
                        </button>
                    </form>
                </div>
            </div>
        </header>
    );
}
