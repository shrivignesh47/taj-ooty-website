 
"use client";

import { useEffect, useState, useCallback } from 'react';
import { fetchActivityLog } from '@/features/ordering/actions/adminActions';
import {
    Activity, ShieldCheck, Search, RefreshCw, Filter, User,
    Lock, FileText, CreditCard, Gift, Eye, X, Code, CheckCircle, Clock
} from 'lucide-react';

interface ActivityItem {
    id: string;
    created_at: string;
    action: string;
    category?: 'auth' | 'orders' | 'billing' | 'loyalty' | 'system';
    staff_name?: string;
    staff_role?: string;
    staff_users?: {
        name?: string;
        roles?: { name?: string };
    };
    details?: Record<string, any>;
}

function fmt(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

function getRelativeTime(d: string | null) {
    if (!d) return '';
    const now = new Date().getTime();
    const past = new Date(d).getTime();
    const diffSec = Math.floor((now - past) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
}

function getActionBadgeStyle(action: string, category?: string) {
    const act = (action || '').toUpperCase();
    if (act.includes('LOGIN')) {
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
    if (act.includes('LOGOUT')) {
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
    if (act.includes('BILLED') || act.includes('SETTLED') || category === 'billing') {
        return 'bg-amber-100 text-amber-900 border-amber-300';
    }
    if (act.includes('LOYALTY') || category === 'loyalty') {
        return 'bg-purple-100 text-purple-800 border-purple-300';
    }
    if (act.includes('ORDER') || act.includes('KITCHEN') || category === 'orders') {
        return 'bg-sky-100 text-sky-800 border-sky-300';
    }
    return 'bg-gray-100 text-gray-800 border-gray-300';
}

export function AdminActivityLog() {
    const [log, setLog] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filters & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedPayload, setSelectedPayload] = useState<{ action: string; details: any; staff: string; time: string } | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(false);

    const loadLog = useCallback(async (isSilent = false) => {
        if (!isSilent) setRefreshing(true);
        const res = await fetchActivityLog();
        if (res.success) {
            setLog(res.data as ActivityItem[]);
            setError(null);
        } else {
            setError(res.error ?? 'Failed to load activity log');
        }
        setLoading(false);
        setRefreshing(false);
    }, []);

    useEffect(() => {
        loadLog();
    }, [loadLog]);

    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(() => {
            loadLog(true);
        }, 10000);
        return () => clearInterval(interval);
    }, [autoRefresh, loadLog]);

    const categories = [
        { id: 'all', label: 'All Activity', icon: Activity },
        { id: 'auth', label: 'Security & Auth', icon: Lock },
        { id: 'orders', label: 'Orders & Kitchen', icon: FileText },
        { id: 'billing', label: 'Billing & Cashier', icon: CreditCard },
        { id: 'loyalty', label: 'Loyalty Program', icon: Gift },
    ];

    const filteredLogs = log.filter(item => {
        const staffName = item.staff_name || item.staff_users?.name || '';
        const actionStr = item.action || '';
        const categoryStr = item.category || '';
        const detailsStr = JSON.stringify(item.details || {});

        const matchesSearch =
            searchQuery === '' ||
            staffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            actionStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
            detailsStr.toLowerCase().includes(searchQuery.toLowerCase());

        let matchesCat = true;
        if (selectedCategory !== 'all') {
            if (selectedCategory === 'auth') {
                matchesCat = categoryStr === 'auth' || actionStr.includes('LOGIN') || actionStr.includes('LOGOUT');
            } else if (selectedCategory === 'orders') {
                matchesCat = categoryStr === 'orders' || actionStr.includes('ORDER') || actionStr.includes('KITCHEN');
            } else if (selectedCategory === 'billing') {
                matchesCat = categoryStr === 'billing' || actionStr.includes('BILL') || actionStr.includes('DRAWER') || actionStr.includes('EXPENSE');
            } else if (selectedCategory === 'loyalty') {
                matchesCat = categoryStr === 'loyalty' || actionStr.includes('LOYALTY');
            }
        }

        return matchesSearch && matchesCat;
    });

    const stats = {
        total: log.length,
        auth: log.filter(l => (l.category === 'auth' || l.action.includes('LOGIN') || l.action.includes('LOGOUT'))).length,
        orders: log.filter(l => (l.category === 'orders' || l.action.includes('ORDER'))).length,
        billing: log.filter(l => (l.category === 'billing' || l.action.includes('BILL'))).length,
        loyalty: log.filter(l => (l.category === 'loyalty' || l.action.includes('LOYALTY'))).length,
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 text-[#4E1414]">
            <Activity className="w-10 h-10 animate-spin text-[#C9974A] mb-3" />
            <p className="font-extrabold text-base">Loading Activity Log Feed…</p>
        </div>
    );

    if (error) return (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-6 shadow-sm">
            <p className="font-bold text-lg">Could not load activity log</p>
            <p className="text-sm mt-1">{error}</p>
            <button
                onClick={() => loadLog()}
                className="mt-4 bg-[#4E1414] text-[#F6EEDF] px-4 py-2 rounded-xl text-xs font-bold shadow hover:bg-[#3b0e0e] transition-colors cursor-pointer"
            >
                Try Reloading
            </button>
        </div>
    );

    return (
        <div className="space-y-6">

            {/* ── Top Metric Summary Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                    { label: 'Total Logged', count: stats.total, icon: Activity, color: 'text-amber-700 bg-amber-50 border-amber-200' },
                    { label: 'Security & Auth', count: stats.auth, icon: Lock, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
                    { label: 'Orders & KDS', count: stats.orders, icon: FileText, color: 'text-sky-700 bg-sky-50 border-sky-200' },
                    { label: 'Billing & Cashier', count: stats.billing, icon: CreditCard, color: 'text-amber-800 bg-amber-50/70 border-amber-200' },
                    { label: 'Loyalty Activity', count: stats.loyalty, icon: Gift, color: 'text-purple-700 bg-purple-50 border-purple-200' },
                ].map(({ label, count, icon: Icon, color }) => (
                    <div key={label} className={`border rounded-2xl p-3.5 flex items-center gap-3 bg-white shadow-xs ${color.split(' ')[2]}`}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                            <Icon className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase text-gray-400">{label}</p>
                            <p className="font-extrabold text-lg text-[#4E1414] leading-tight">{count}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Filter Bar & Controls ── */}
            <div className="bg-white rounded-2xl border border-[#C9974A]/20 p-4 shadow-sm space-y-3">
                <div className="flex flex-col md:flex-row justify-between gap-3 items-stretch md:items-center">
                    
                    {/* Category Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto taj-scrollbar pb-1 md:pb-0">
                        {categories.map(cat => {
                            const Icon = cat.icon;
                            const isActive = selectedCategory === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                        isActive
                                            ? 'bg-[#4E1414] text-[#F6EEDF] shadow-sm'
                                            : 'bg-[#F6EEDF]/40 text-[#4E1414]/70 hover:bg-[#F6EEDF] hover:text-[#4E1414]'
                                    }`}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    {cat.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Right Controls */}
                    <div className="flex items-center gap-2">
                        {/* Auto-refresh toggle */}
                        <button
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                autoRefresh
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                            }`}
                            title="Auto-refresh log feed every 10s"
                        >
                            <Clock className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
                            {autoRefresh ? 'Live Updates ON' : 'Live OFF'}
                        </button>

                        {/* Manual refresh */}
                        <button
                            onClick={() => loadLog()}
                            disabled={refreshing}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4E1414] text-[#F6EEDF] hover:bg-[#3b0e0e] rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Search Bar Input */}
                <div className="relative">
                    <Search className="absolute left-3 top.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search activity by action name, staff member, or detail payload..."
                        className="w-full pl-9 pr-4 py-2 bg-[#F6EEDF]/20 border border-[#C9974A]/30 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#C9974A] text-[#4E1414]"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#4E1414]"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Main Activity Feed Table ── */}
            <div className="bg-white rounded-2xl border border-[#C9974A]/20 shadow-sm overflow-hidden">
                <div className="bg-[#4E1414] px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <Activity className="w-5 h-5 text-[#C9974A]" />
                        <h3 className="font-bold text-[#F6EEDF] text-sm md:text-base">System Audit & Activity Timeline</h3>
                    </div>
                    <span className="text-xs text-[#F6EEDF]/80 font-bold bg-[#C9974A]/20 px-3 py-1 rounded-full border border-[#C9974A]/30">
                        {filteredLogs.length} matching events
                    </span>
                </div>

                {filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-[#4E1414]/60 bg-white p-8">
                        <ShieldCheck className="w-12 h-12 mb-3 opacity-30 text-[#C9974A]" />
                        <p className="text-base font-bold">No activity logs found</p>
                        <p className="text-xs text-gray-400 mt-1">
                            {searchQuery ? `No records matching "${searchQuery}"` : 'Activity events will automatically be recorded here.'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto taj-scrollbar">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-[#F6EEDF]/60 border-b border-[#C9974A]/20">
                                <tr>
                                    <th className="px-5 py-3 font-extrabold text-[11px] text-[#4E1414] uppercase tracking-wider">Timestamp</th>
                                    <th className="px-5 py-3 font-extrabold text-[11px] text-[#4E1414] uppercase tracking-wider">Staff / Origin</th>
                                    <th className="px-5 py-3 font-extrabold text-[11px] text-[#4E1414] uppercase tracking-wider">Action Dispatched</th>
                                    <th className="px-5 py-3 font-extrabold text-[11px] text-[#4E1414] uppercase tracking-wider">Activity Details</th>
                                    <th className="px-4 py-3 font-extrabold text-[11px] text-[#4E1414] uppercase tracking-wider text-right">Payload</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F6EEDF]">
                                {filteredLogs.map(row => {
                                    const staffName = row.staff_name || row.staff_users?.name || 'System Admin';
                                    const staffRole = row.staff_role || row.staff_users?.roles?.name || 'Automaton';
                                    const badgeClass = getActionBadgeStyle(row.action, row.category);

                                    return (
                                        <tr key={row.id} className="hover:bg-[#F6EEDF]/30 transition-colors">
                                            
                                            {/* Timestamp */}
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <div className="text-xs font-bold text-[#4E1414]">{fmt(row.created_at)}</div>
                                                <div className="text-[10px] font-semibold text-gray-400 mt-0.5">{getRelativeTime(row.created_at)}</div>
                                            </td>

                                            {/* Staff / Origin */}
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded-lg bg-[#4E1414] text-[#C9974A] flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                                                        {staffName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <span className="block font-bold text-xs text-[#4E1414] truncate max-w-[140px]">{staffName}</span>
                                                        <span className="inline-block text-[9px] font-extrabold uppercase px-1.5 py-0.2 bg-[#C9974A]/15 text-[#4E1414] rounded">
                                                            {staffRole}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Action Dispatched Badge */}
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black border uppercase tracking-wider ${badgeClass}`}>
                                                    {row.action}
                                                </span>
                                            </td>

                                            {/* Details Summary Preview */}
                                            <td className="px-5 py-3.5 text-xs">
                                                {row.details && Object.keys(row.details).length > 0 ? (
                                                    <div className="flex flex-wrap gap-1.5 max-w-md">
                                                        {Object.entries(row.details).slice(0, 3).map(([k, v]) => (
                                                            <span key={k} className="inline-flex items-center gap-1 bg-stone-100 text-stone-700 px-2 py-0.5 rounded text-[11px] font-medium border border-stone-200">
                                                                <span className="font-bold text-stone-500">{k}:</span>
                                                                <span className="font-semibold text-stone-900 truncate max-w-[120px]">{String(v)}</span>
                                                            </span>
                                                        ))}
                                                        {Object.keys(row.details).length > 3 && (
                                                            <span className="text-[10px] text-gray-400 font-bold self-center">
                                                                +{Object.keys(row.details).length - 3} more
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 italic text-[11px]">No payload data</span>
                                                )}
                                            </td>

                                            {/* Payload Inspector Button */}
                                            <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                                <button
                                                    onClick={() => setSelectedPayload({
                                                        action: row.action,
                                                        details: row.details,
                                                        staff: staffName,
                                                        time: fmt(row.created_at)
                                                    })}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#F6EEDF] hover:bg-[#C9974A]/20 text-[#4E1414] rounded-lg text-[11px] font-bold border border-[#C9974A]/30 transition-all cursor-pointer"
                                                >
                                                    <Code className="w-3 h-3 text-[#C9974A]" /> JSON
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── JSON Payload Modal ── */}
            {selectedPayload && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
                    onClick={() => setSelectedPayload(null)}
                >
                    <div
                        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-[#C9974A]/30"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="bg-[#4E1414] px-6 py-4 flex justify-between items-center">
                            <div>
                                <h4 className="text-[#F6EEDF] font-bold text-sm flex items-center gap-2">
                                    <Code className="w-4 h-4 text-[#C9974A]" /> {selectedPayload.action}
                                </h4>
                                <p className="text-xs text-[#C9974A] mt-0.5">{selectedPayload.staff} • {selectedPayload.time}</p>
                            </div>
                            <button
                                onClick={() => setSelectedPayload(null)}
                                className="text-[#F6EEDF]/80 hover:text-white transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-3">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Action Payload JSON</p>
                            <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-72 leading-relaxed taj-scrollbar">
                                {JSON.stringify(selectedPayload.details || {}, null, 2)}
                            </pre>
                            <button
                                onClick={() => setSelectedPayload(null)}
                                className="w-full bg-[#4E1414] text-[#F6EEDF] font-bold py-2.5 rounded-xl hover:bg-[#3b0e0e] transition-colors text-xs cursor-pointer"
                            >
                                Close Payload Inspector
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

