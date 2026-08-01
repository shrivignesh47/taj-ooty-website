"use client";

import { useState, useEffect, useCallback } from 'react';
import {
    Gift, ToggleLeft, ToggleRight, TrendingUp, Users, Star,
    Coins, RotateCcw, Search, ChevronDown, ChevronUp,
    CheckCircle2, XCircle, Loader2, RefreshCw, Edit3, Save, X,
    Award, ArrowUpRight, ArrowDownRight, AlertCircle, Info
} from 'lucide-react';
import {
    saveLoyaltySettings,
    getLoyaltyBalance,
    getCustomerLoyaltyHistory,
    adminAdjustLoyaltyPoints,
} from '@/features/ordering/actions/loyaltyActions';
import type { LoyaltyTransactionData, CustomerLoyaltyData } from '@/features/ordering/actions/loyaltyActions';
import { supabase } from '@/features/ordering/lib/supabase';

interface LoyaltySettings {
    loyalty_enabled: boolean;
    loyalty_points_per_rupee: number;
    loyalty_redemption_rate: number;
}

interface CustomerRow {
    id: string;
    customer_phone: string;
    customer_name: string | null;
    points_balance: number;
    lifetime_points_earned: number;
    lifetime_visits: number;
    created_at: string;
    updated_at: string;
}

export function AdminLoyalty() {
    const [settings, setSettings] = useState<LoyaltySettings>({
        loyalty_enabled: false,
        loyalty_points_per_rupee: 1,
        loyalty_redemption_rate: 0.5,
    });
    const [localSettings, setLocalSettings] = useState<LoyaltySettings>({
        loyalty_enabled: false,
        loyalty_points_per_rupee: 1,
        loyalty_redemption_rate: 0.5,
    });
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
    const [loading, setLoading] = useState(true);

    // Customer list
    const [customers, setCustomers] = useState<CustomerRow[]>([]);
    const [customersLoading, setCustomersLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState<'points' | 'visits' | 'name'>('points');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    // Customer detail drawer
    const [drawerPhone, setDrawerPhone] = useState<string | null>(null);
    const [drawerLoyalty, setDrawerLoyalty] = useState<CustomerLoyaltyData | null>(null);
    const [drawerTxs, setDrawerTxs] = useState<LoyaltyTransactionData[]>([]);
    const [drawerLoading, setDrawerLoading] = useState(false);

    // Manual adjust
    const [adjustPhone, setAdjustPhone] = useState('');
    const [adjustPoints, setAdjustPoints] = useState(0);
    const [adjustNote, setAdjustNote] = useState('');
    const [adjusting, setAdjusting] = useState(false);

    const fetchSettings = useCallback(async () => {
        const { data } = await supabase
            .from('restaurant_settings')
            .select('loyalty_enabled, loyalty_points_per_rupee, loyalty_redemption_rate')
            .limit(1)
            .single();
        if (data) {
            const s: LoyaltySettings = {
                loyalty_enabled: data.loyalty_enabled ?? false,
                loyalty_points_per_rupee: Number(data.loyalty_points_per_rupee) || 1,
                loyalty_redemption_rate: Number(data.loyalty_redemption_rate) || 0.5,
            };
            setSettings(s);
            setLocalSettings(s);
        }
        setLoading(false);
    }, []);

    const fetchCustomers = useCallback(async () => {
        setCustomersLoading(true);
        const { data } = await supabase
            .from('customer_loyalty')
            .select('*')
            .order('points_balance', { ascending: false });
        if (data) setCustomers(data as CustomerRow[]);
        setCustomersLoading(false);
    }, []);

    useEffect(() => {
        fetchSettings();
        fetchCustomers();
    }, [fetchSettings, fetchCustomers]);

    const handleSave = async () => {
        setSaving(true);
        setSaveMsg(null);
        const res = await saveLoyaltySettings(
            localSettings.loyalty_enabled,
            localSettings.loyalty_points_per_rupee,
            localSettings.loyalty_redemption_rate
        );
        setSaving(false);
        if (res.success) {
            setSettings(localSettings);
            setSaveMsg({ type: 'ok', text: 'Loyalty settings saved successfully!' });
        } else {
            setSaveMsg({ type: 'err', text: res.error || 'Failed to save settings.' });
        }
        setTimeout(() => setSaveMsg(null), 4000);
    };

    const handleToggleEnable = async () => {
        const newVal = !localSettings.loyalty_enabled;
        const newSettings = { ...localSettings, loyalty_enabled: newVal };
        setLocalSettings(newSettings);
        setSaving(true);
        const res = await saveLoyaltySettings(
            newVal,
            newSettings.loyalty_points_per_rupee,
            newSettings.loyalty_redemption_rate
        );
        setSaving(false);
        if (res.success) {
            setSettings(newSettings);
            setSaveMsg({ type: 'ok', text: `Loyalty program ${newVal ? 'enabled' : 'disabled'} successfully!` });
        } else {
            setLocalSettings(settings);
            setSaveMsg({ type: 'err', text: res.error || 'Failed to update.' });
        }
        setTimeout(() => setSaveMsg(null), 3000);
    };

    const openDrawer = async (phone: string) => {
        setDrawerPhone(phone);
        setDrawerLoading(true);
        const [loyRes, txRes] = await Promise.all([
            getLoyaltyBalance(phone),
            getCustomerLoyaltyHistory(phone),
        ]);
        setDrawerLoyalty(loyRes.loyalty);
        setDrawerTxs(txRes.transactions || []);
        setDrawerLoading(false);
    };

    const handleManualAdjust = async () => {
        if (!adjustPhone || adjustPoints === 0) return;
        setAdjusting(true);
        const res = await adminAdjustLoyaltyPoints(adjustPhone, adjustPoints, adjustNote);
        setAdjusting(false);
        if (res.success) {
            setAdjustPhone('');
            setAdjustPoints(0);
            setAdjustNote('');
            fetchCustomers();
            setSaveMsg({ type: 'ok', text: `Points adjusted for ${adjustPhone.trim()}` });
        } else {
            setSaveMsg({ type: 'err', text: res.error || 'Adjustment failed.' });
        }
        setTimeout(() => setSaveMsg(null), 3000);
    };

    const filteredCustomers = customers
        .filter(c =>
            (c.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
            c.customer_phone.includes(search)) ?? true
        )
        .sort((a, b) => {
            const va: number | string = sortBy === 'name'
                ? (a.customer_name || '')
                : sortBy === 'visits' ? a.lifetime_visits : a.points_balance;
            const vb: number | string = sortBy === 'name'
                ? (b.customer_name || '')
                : sortBy === 'visits' ? b.lifetime_visits : b.points_balance;
            if (typeof va === 'string') {
                return sortDir === 'asc'
                    ? va.localeCompare(vb as string)
                    : (vb as string).localeCompare(va);
            }
            return sortDir === 'asc'
                ? (va as number) - (vb as number)
                : (vb as number) - (va as number);
        });

    const totalPoints = customers.reduce((s, c) => s + c.points_balance, 0);
    const totalLifetime = customers.reduce((s, c) => s + c.lifetime_points_earned, 0);
    const totalVisits = customers.reduce((s, c) => s + c.lifetime_visits, 0);

    const hasChanges =
        localSettings.loyalty_enabled !== settings.loyalty_enabled ||
        localSettings.loyalty_points_per_rupee !== settings.loyalty_points_per_rupee ||
        localSettings.loyalty_redemption_rate !== settings.loyalty_redemption_rate;

    if (loading) return (
        <div className="flex items-center justify-center py-40">
            <Loader2 className="w-8 h-8 animate-spin text-[#C9974A]" />
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Toast */}
            {saveMsg && (
                <div className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-bold border shadow-sm ${saveMsg.type === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
                    {saveMsg.type === 'ok'
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        : <XCircle className="w-5 h-5 text-red-600 shrink-0" />}
                    {saveMsg.text}
                </div>
            )}

            {/* ── Master Toggle ── */}
            <div className={`rounded-3xl border-2 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${localSettings.loyalty_enabled ? 'bg-amber-50 border-[#C9974A]' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${localSettings.loyalty_enabled ? 'bg-[#C9974A]' : 'bg-gray-200'}`}>
                        <Gift className={`w-7 h-7 ${localSettings.loyalty_enabled ? 'text-[#4E1414]' : 'text-gray-400'}`} />
                    </div>
                    <div>
                        <h2 className="font-extrabold text-xl text-[#4E1414]">Customer Loyalty Program</h2>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {localSettings.loyalty_enabled
                                ? '✅ Program is ACTIVE — customers earn & redeem points on every bill'
                                : '⏸ Program is PAUSED — no points are earned or redeemed'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleToggleEnable}
                    disabled={saving}
                    className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl font-black text-sm transition-all shadow-sm cursor-pointer ${localSettings.loyalty_enabled ? 'bg-[#4E1414] text-[#F6EEDF] hover:bg-[#3b0e0e]' : 'bg-[#C9974A] text-[#4E1414] hover:bg-[#b8863d]'}`}
                >
                    {saving
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : localSettings.loyalty_enabled
                            ? <ToggleRight className="w-5 h-5" />
                            : <ToggleLeft className="w-5 h-5" />}
                    {localSettings.loyalty_enabled ? 'Disable Program' : 'Enable Program'}
                </button>
            </div>

            {/* ── Stats Row ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {([
                    { label: 'Total Members', value: customers.length.toString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Live Points Balance', value: totalPoints.toLocaleString(), icon: Coins, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Lifetime Points Issued', value: totalLifetime.toLocaleString(), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Total Loyalty Visits', value: totalVisits.toLocaleString(), icon: Star, color: 'text-purple-600', bg: 'bg-purple-50' },
                ] as const).map(({ label, value, icon: Icon, color, bg }) => (
                    <div key={label} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                            <Icon className={`w-5 h-5 ${color}`} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-bold">{label}</p>
                            <p className="font-extrabold text-lg text-[#4E1414]">{value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Settings Panel ── */}
            <div className="bg-white border border-[#C9974A]/20 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h3 className="font-extrabold text-lg text-[#4E1414] flex items-center gap-2">
                            <Edit3 className="w-5 h-5 text-[#C9974A]" /> Loyalty Rules Configuration
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">Define how points are earned and redeemed. Changes take effect on next bill.</p>
                    </div>
                    {hasChanges && (
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-5 py-2.5 bg-[#4E1414] text-[#F6EEDF] rounded-xl font-bold text-sm hover:bg-[#3b0e0e] transition-all shadow cursor-pointer"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Changes
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Earning Rate */}
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
                        <div className="flex items-start gap-2">
                            <ArrowUpRight className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                            <div>
                                <h4 className="font-extrabold text-sm text-amber-900">Points Earning Rate</h4>
                                <p className="text-xs text-amber-700 mt-0.5">Points given to customer per ₹1 spent</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                min={0.1}
                                max={100}
                                step={0.1}
                                value={localSettings.loyalty_points_per_rupee}
                                onChange={e => setLocalSettings(p => ({ ...p, loyalty_points_per_rupee: parseFloat(e.target.value) || 0 }))}
                                className="flex-1 bg-white border border-amber-300 rounded-xl px-3 py-2.5 text-lg font-extrabold text-[#4E1414] focus:outline-none focus:border-[#C9974A] text-center"
                            />
                            <span className="text-sm font-bold text-amber-800 shrink-0">pts / ₹1</span>
                        </div>
                        <div className="bg-white rounded-xl px-3 py-2 text-xs font-medium text-gray-600 border border-amber-200">
                            <span className="font-extrabold text-[#4E1414]">Example: </span>
                            ₹500 bill → <span className="font-bold text-amber-700">{Math.floor(500 * localSettings.loyalty_points_per_rupee)} points</span> earned
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {[0.5, 1, 2, 5].map(r => (
                                <button
                                    key={r}
                                    onClick={() => setLocalSettings(p => ({ ...p, loyalty_points_per_rupee: r }))}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${localSettings.loyalty_points_per_rupee === r ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'}`}
                                >
                                    {r} pt/₹1
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Redemption Rate */}
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-3">
                        <div className="flex items-start gap-2">
                            <ArrowDownRight className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                            <div>
                                <h4 className="font-extrabold text-sm text-emerald-900">Point Redemption Value</h4>
                                <p className="text-xs text-emerald-700 mt-0.5">Rupee value of each point when redeemed at checkout</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                min={0.01}
                                max={10}
                                step={0.01}
                                value={localSettings.loyalty_redemption_rate}
                                onChange={e => setLocalSettings(p => ({ ...p, loyalty_redemption_rate: parseFloat(e.target.value) || 0 }))}
                                className="flex-1 bg-white border border-emerald-300 rounded-xl px-3 py-2.5 text-lg font-extrabold text-[#4E1414] focus:outline-none focus:border-emerald-500 text-center"
                            />
                            <span className="text-sm font-bold text-emerald-800 shrink-0">₹ / point</span>
                        </div>
                        <div className="bg-white rounded-xl px-3 py-2 text-xs font-medium text-gray-600 border border-emerald-200">
                            <span className="font-extrabold text-[#4E1414]">Example: </span>
                            100 points → <span className="font-bold text-emerald-700">₹{(100 * localSettings.loyalty_redemption_rate).toFixed(2)}</span> discount
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {[0.25, 0.5, 1, 2].map(r => (
                                <button
                                    key={r}
                                    onClick={() => setLocalSettings(p => ({ ...p, loyalty_redemption_rate: r }))}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${localSettings.loyalty_redemption_rate === r ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'}`}
                                >
                                    ₹{r}/pt
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Summary Banner */}
                <div className="mt-5 bg-[#4E1414]/5 border border-[#C9974A]/30 rounded-2xl px-5 py-4 flex items-start gap-3">
                    <Info className="w-5 h-5 text-[#C9974A] shrink-0 mt-0.5" />
                    <p className="text-xs text-[#4E1414] font-medium leading-relaxed">
                        <strong>Current Rule:</strong>{' '}
                        Customer earns <strong className="text-amber-700">{localSettings.loyalty_points_per_rupee} pt per ₹1</strong> spent.
                        Each point is worth <strong className="text-emerald-700">₹{localSettings.loyalty_redemption_rate}</strong> when redeemed.
                        On a ₹1,000 bill, customer earns{' '}
                        <strong>{Math.floor(1000 * localSettings.loyalty_points_per_rupee)} points</strong>{' '}
                        worth <strong>₹{(Math.floor(1000 * localSettings.loyalty_points_per_rupee) * localSettings.loyalty_redemption_rate).toFixed(2)}</strong> in future redemption value.
                    </p>
                </div>
            </div>

            {/* ── Manual Adjust ── */}
            <div className="bg-white border border-[#C9974A]/20 rounded-3xl p-6 shadow-sm">
                <h3 className="font-extrabold text-lg text-[#4E1414] flex items-center gap-2 mb-4">
                    <RotateCcw className="w-5 h-5 text-[#C9974A]" /> Manual Points Adjustment
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Customer Phone</label>
                        <input
                            type="text"
                            value={adjustPhone}
                            onChange={e => setAdjustPhone(e.target.value)}
                            placeholder="+91 98765 43210"
                            className="w-full bg-[#F6EEDF]/30 border border-[#C9974A]/30 rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:border-[#C9974A]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Points (+add / −deduct)</label>
                        <input
                            type="number"
                            value={adjustPoints || ''}
                            onChange={e => setAdjustPoints(parseInt(e.target.value) || 0)}
                            placeholder="e.g. +100 or -50"
                            className="w-full bg-[#F6EEDF]/30 border border-[#C9974A]/30 rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:border-[#C9974A]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Reason / Note</label>
                        <input
                            type="text"
                            value={adjustNote}
                            onChange={e => setAdjustNote(e.target.value)}
                            placeholder="e.g. Birthday bonus"
                            className="w-full bg-[#F6EEDF]/30 border border-[#C9974A]/30 rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:border-[#C9974A]"
                        />
                    </div>
                    <button
                        onClick={handleManualAdjust}
                        disabled={adjusting || !adjustPhone || adjustPoints === 0}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#4E1414] text-[#F6EEDF] rounded-xl font-bold text-sm hover:bg-[#3b0e0e] disabled:opacity-50 transition-all cursor-pointer"
                    >
                        {adjusting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                        Apply
                    </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Positive = add points, negative = deduct. All adjustments are logged in transaction history.
                </p>
            </div>

            {/* ── Member Database ── */}
            <div className="bg-white border border-[#C9974A]/20 rounded-3xl p-6 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-5">
                    <h3 className="font-extrabold text-lg text-[#4E1414] flex items-center gap-2">
                        <Users className="w-5 h-5 text-[#C9974A]" /> Member Loyalty Database
                        <span className="text-xs font-bold bg-[#C9974A]/20 text-[#4E1414] px-2 py-0.5 rounded-full">{customers.length} members</span>
                    </h3>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search name or phone..."
                                className="w-full pl-9 pr-3 py-2 bg-[#F6EEDF]/30 border border-[#C9974A]/30 rounded-xl text-xs font-bold focus:outline-none"
                            />
                        </div>
                        <button
                            onClick={fetchCustomers}
                            className="p-2 bg-[#F6EEDF] border border-[#C9974A]/30 rounded-xl hover:bg-[#C9974A]/10 transition-all cursor-pointer"
                            title="Refresh"
                        >
                            <RefreshCw className="w-4 h-4 text-[#4E1414]" />
                        </button>
                    </div>
                </div>

                {/* Sort Header */}
                <div className="grid grid-cols-5 gap-2 px-3 py-2 bg-[#4E1414] text-[#F6EEDF] rounded-xl text-[11px] font-extrabold uppercase tracking-wide mb-2">
                    {([
                        { key: 'name', label: 'Customer' },
                        { key: 'phone', label: 'Phone' },
                        { key: 'points', label: 'Balance' },
                        { key: 'visits', label: 'Visits' },
                        { key: 'action', label: '' },
                    ] as const).map(col => (
                        <button
                            key={col.key}
                            onClick={() => {
                                const sortable: string[] = ['name', 'points', 'visits'];
                                if (!sortable.includes(col.key)) return;
                                const k = col.key as 'name' | 'points' | 'visits';
                                if (sortBy === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                                else { setSortBy(k); setSortDir('desc'); }
                            }}
                            className={`text-left flex items-center gap-1 ${(['name', 'points', 'visits'] as string[]).includes(col.key) ? 'cursor-pointer hover:text-[#C9974A]' : 'cursor-default'} transition-colors`}
                        >
                            {col.label}
                            {(['name', 'points', 'visits'] as string[]).includes(col.key) && sortBy === (col.key as 'name' | 'points' | 'visits') && (
                                sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                            )}
                        </button>
                    ))}
                </div>

                {customersLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-6 h-6 animate-spin text-[#C9974A]" />
                    </div>
                ) : filteredCustomers.length === 0 ? (
                    <div className="text-center py-16 text-gray-400 text-sm font-bold">
                        {search
                            ? `No members matching "${search}"`
                            : 'No loyalty members yet — customers earn points when phone number is entered at checkout.'}
                    </div>
                ) : (
                    <div className="space-y-1.5 max-h-96 overflow-y-auto taj-scrollbar">
                        {filteredCustomers.map(c => (
                            <div
                                key={c.id}
                                className="grid grid-cols-5 gap-2 px-3 py-2.5 bg-[#F6EEDF]/30 hover:bg-[#F6EEDF]/60 rounded-xl text-xs font-medium border border-transparent hover:border-[#C9974A]/20 transition-all"
                            >
                                <div className="font-bold text-[#4E1414] truncate">{c.customer_name || 'Guest'}</div>
                                <div className="text-gray-500 truncate">{c.customer_phone}</div>
                                <div className="flex items-center gap-1.5">
                                    <span className="font-extrabold text-amber-700 text-sm">{c.points_balance.toLocaleString()}</span>
                                    <span className="text-[10px] text-gray-400">pts</span>
                                </div>
                                <div className="text-gray-600 font-bold">{c.lifetime_visits} visits</div>
                                <div>
                                    <button
                                        onClick={() => openDrawer(c.customer_phone)}
                                        className="px-3 py-1 bg-[#4E1414] text-[#F6EEDF] rounded-lg text-[10px] font-bold hover:bg-[#3b0e0e] transition-all cursor-pointer"
                                    >
                                        View
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Customer Detail Drawer ── */}
            {drawerPhone && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm"
                    onClick={() => setDrawerPhone(null)}
                >
                    <div
                        className="bg-white w-full max-w-lg h-full flex flex-col shadow-2xl border-l border-[#C9974A]/30"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="bg-[#4E1414] px-6 py-5 flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-[#F6EEDF] font-extrabold text-base">
                                    {drawerLoyalty?.customer_name || 'Guest Customer'}
                                </h3>
                                <p className="text-[#C9974A] text-xs font-bold mt-0.5">{drawerPhone}</p>
                            </div>
                            <button
                                onClick={() => setDrawerPhone(null)}
                                className="text-[#F6EEDF]/70 hover:text-white transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {drawerLoading ? (
                            <div className="flex items-center justify-center flex-1">
                                <Loader2 className="w-8 h-8 animate-spin text-[#C9974A]" />
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto taj-scrollbar p-6 space-y-5">
                                <div className="grid grid-cols-3 gap-3">
                                    {([
                                        {
                                            label: 'Current Balance',
                                            value: drawerLoyalty?.points_balance.toLocaleString() || '0',
                                            sub: `= ₹${((drawerLoyalty?.points_balance || 0) * localSettings.loyalty_redemption_rate).toFixed(2)} value`,
                                            color: 'bg-amber-50 border-amber-200 text-amber-700',
                                        },
                                        {
                                            label: 'Lifetime Earned',
                                            value: drawerLoyalty?.lifetime_points_earned.toLocaleString() || '0',
                                            sub: 'total points ever',
                                            color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
                                        },
                                        {
                                            label: 'Total Visits',
                                            value: drawerLoyalty?.lifetime_visits.toString() || '0',
                                            sub: 'with phone #',
                                            color: 'bg-blue-50 border-blue-200 text-blue-700',
                                        },
                                    ] as const).map(({ label, value, sub, color }) => (
                                        <div key={label} className={`border rounded-2xl p-3 text-center ${color}`}>
                                            <p className="text-[10px] font-bold uppercase opacity-70">{label}</p>
                                            <p className="font-extrabold text-2xl mt-0.5">{value}</p>
                                            <p className="text-[10px] opacity-60 mt-0.5">{sub}</p>
                                        </div>
                                    ))}
                                </div>

                                <div>
                                    <h4 className="font-extrabold text-sm text-[#4E1414] mb-3 flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-[#C9974A]" /> Transaction History
                                    </h4>
                                    {drawerTxs.length === 0 ? (
                                        <p className="text-xs text-gray-400 italic text-center py-8">No transactions yet</p>
                                    ) : (
                                        <div className="space-y-1.5">
                                            {drawerTxs.map(tx => (
                                                <div
                                                    key={tx.id}
                                                    className="flex items-center justify-between bg-[#F6EEDF]/40 border border-[#C9974A]/15 rounded-xl px-3 py-2.5"
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${tx.type === 'earned' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                                            {tx.type === 'earned'
                                                                ? <ArrowUpRight className="w-4 h-4" />
                                                                : <ArrowDownRight className="w-4 h-4" />}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-[#4E1414] capitalize">{tx.type}</p>
                                                            <p className="text-[10px] text-gray-400">{tx.note}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`font-extrabold text-sm ${tx.type === 'earned' ? 'text-emerald-600' : 'text-red-600'}`}>
                                                            {tx.type === 'earned' ? '+' : '−'}{tx.points} pts
                                                        </p>
                                                        <p className="text-[10px] text-gray-400">
                                                            {new Date(tx.created_at).toLocaleDateString('en-IN', {
                                                                day: 'numeric', month: 'short',
                                                                hour: '2-digit', minute: '2-digit',
                                                            })}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
