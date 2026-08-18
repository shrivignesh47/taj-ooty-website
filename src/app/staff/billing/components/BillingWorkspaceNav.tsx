"use client";

import {
    BarChart3,
    CircleDollarSign,
    Globe2,
    LayoutDashboard,
    ReceiptText,
    ShoppingBag,
    Table2
} from 'lucide-react';
import type { BillingWorkspaceNavProps, MainView } from '../types';
import { fmt } from './utils';

export function BillingWorkspaceNav({
    activeView,
    onViewChange,
    onOpenShift,
    activeTableCount,
    pendingSettlementCount,
    onlineOrderCount,
    stats
}: BillingWorkspaceNavProps) {
    const navigationClassName = (view: MainView) => (
        activeView === view
            ? 'bg-slate-900 text-white shadow-sm'
            : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-950'
    );

    return (
        <section className="border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:px-6">
            <div className="mx-auto flex max-w-[1600px] flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="hidden rounded-xl bg-slate-900 p-2 text-white sm:block">
                        <LayoutDashboard className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Billing workspace</p>
                        <p className="truncate text-sm font-semibold text-slate-900">Fast paths for the active shift</p>
                    </div>
                    <button
                        onClick={onOpenShift}
                        className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 xl:hidden"
                    >
                        <CircleDollarSign className="h-3.5 w-3.5" /> Shift
                    </button>
                </div>

                <nav aria-label="Billing workspace" className="flex gap-2 overflow-x-auto pb-1 xl:pb-0">
                    <button onClick={() => onViewChange('bento')} className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${navigationClassName('bento')}`}>
                        <LayoutDashboard className="h-3.5 w-3.5" /> Overview
                    </button>
                    <button onClick={() => onViewChange('tables')} className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${navigationClassName('tables')}`}>
                        <Table2 className="h-3.5 w-3.5" /> Tables <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{activeTableCount}</span>
                    </button>
                    <button onClick={() => onViewChange('takeaway')} className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${navigationClassName('takeaway')}`}>
                        <ShoppingBag className="h-3.5 w-3.5" /> Takeaway
                    </button>
                    <button onClick={() => onViewChange('online_orders')} className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${navigationClassName('online_orders')}`}>
                        <Globe2 className="h-3.5 w-3.5" /> Online <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{onlineOrderCount}</span>
                    </button>
                    <button onClick={() => onViewChange('history')} className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${navigationClassName('history')}`}>
                        <ReceiptText className="h-3.5 w-3.5" /> Invoices
                    </button>
                    <button onClick={() => onViewChange('reports')} className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${navigationClassName('reports')}`}>
                        <BarChart3 className="h-3.5 w-3.5" /> Reports
                    </button>
                </nav>

                <div className="hidden items-center gap-5 border-l border-slate-200 pl-5 xl:flex">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Today&apos;s sales</p>
                        <p className="text-sm font-bold text-slate-900">{fmt(stats?.revenue ?? 0)}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Settlements</p>
                        <p className="text-sm font-bold text-slate-900">{stats?.bills ?? 0}</p>
                    </div>
                    <button onClick={onOpenShift} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">
                        <CircleDollarSign className="h-3.5 w-3.5" />
                        {pendingSettlementCount > 0 ? `${pendingSettlementCount} to settle` : 'Shift controls'}
                    </button>
                </div>
            </div>
        </section>
    );
}
