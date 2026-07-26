"use client";

import { Menu, IndianRupee, RefreshCw, LogOut, LayoutGrid, SlidersHorizontal, Printer } from 'lucide-react';
import { fmt } from './utils';

interface Props {
    dayStats: { revenue: number; bills: number };
    refreshing: boolean;
    setIsSidebarOpen: (open: boolean) => void;
    setRefreshing: (ref: boolean) => void;
    loadData: () => void;
    logoutStaff: (payload: FormData) => void;
    onGoHome?: () => void;
    onOpenCustomize?: () => void;
    onOpenPrinterSetup?: () => void;
}

export function BillingHeader({
    dayStats,
    refreshing,
    setIsSidebarOpen,
    setRefreshing,
    loadData,
    logoutStaff,
    onGoHome,
    onOpenCustomize,
    onOpenPrinterSetup
}: Props) {
    return (
        <header className="bg-[#4E1414] text-[#F6EEDF] px-6 py-4 shadow-md sticky top-0 z-30 border-b border-[#C9974A]/30">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-[#C9974A] cursor-pointer"
                        title="Operations Navigation Drawer"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    
                    <div 
                        onClick={() => onGoHome && onGoHome()}
                        className="w-8 h-8 bg-[#C9974A] rounded-lg flex items-center justify-center cursor-pointer hover:brightness-110 transition-all"
                        title="Go to Dashboard Overview"
                    >
                        <IndianRupee className="w-4 h-4 text-[#4E1414]" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span 
                                onClick={() => onGoHome && onGoHome()}
                                className="font-bold text-sm tracking-wider font-display cursor-pointer hover:text-[#C9974A] transition-colors"
                            >
                                Taj POS Desk
                            </span>
                            <span className="bg-[#C9974A] text-[#4E1414] text-[9px] font-black uppercase px-2 py-0.5 rounded">ONLINE</span>
                        </div>
                    </div>

                    {onGoHome && (
                        <button
                            onClick={onGoHome}
                            className="hidden sm:flex items-center gap-1.5 ml-2 px-3 py-1 bg-white/10 hover:bg-white/20 text-[#C9974A] hover:text-[#F6EEDF] rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                            <LayoutGrid className="w-3.5 h-3.5" /> Dashboard
                        </button>
                    )}
                </div>

                {/* Header stats & actions */}
                <div className="flex items-center gap-3">
                    <div className="hidden lg:flex gap-6 text-[11px] font-black uppercase tracking-wider text-[#C9974A]/80">
                        <span>Register Revenue: <b className="text-[#F6EEDF]">{fmt(dayStats.revenue)}</b></span>
                        <span>Billed checkouts: <b className="text-[#F6EEDF]">{dayStats.bills}</b></span>
                    </div>

                    {onOpenCustomize && (
                        <button
                            onClick={onOpenCustomize}
                            className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#C9974A] hover:text-[#F6EEDF] transition-all text-xs font-bold cursor-pointer"
                            title="Customize Dashboard Layout"
                        >
                            <SlidersHorizontal className="w-4 h-4" />
                            <span className="hidden md:inline">Customize</span>
                        </button>
                    )}

                    {onOpenPrinterSetup && (
                        <button
                            onClick={onOpenPrinterSetup}
                            className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#C9974A] hover:text-[#F6EEDF] transition-all text-xs font-bold cursor-pointer"
                            title="Thermal Printer Setup"
                        >
                            <Printer className="w-4 h-4" />
                            <span className="hidden md:inline">Printer</span>
                        </button>
                    )}

                    <button
                        onClick={() => { setRefreshing(true); loadData(); }}
                        className={`p-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#C9974A] transition-all cursor-pointer ${refreshing ? 'animate-spin' : ''}`}
                        title="Sync POS Data"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>

                    <form action={logoutStaff}>
                        <button type="submit" className="flex items-center gap-1.5 bg-[#F6EEDF]/10 hover:bg-[#F6EEDF]/20 border border-[#F6EEDF]/20 text-[#F6EEDF] font-bold px-3 py-2 rounded-xl text-xs transition-all cursor-pointer">
                            <LogOut className="w-3.5 h-3.5" /> Sign Out
                        </button>
                    </form>
                </div>
            </div>
        </header>
    );
}
