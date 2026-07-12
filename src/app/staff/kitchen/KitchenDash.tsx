"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, CheckCircle2, Flame, Loader2, Printer, Volume2, VolumeX, Settings, Maximize2, Minimize2, Search, History, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { fetchRestaurantSettings, saveKdsConfig } from '@/features/ordering/actions/adminActions';
import { advanceOrderStatus, markKitchenOrderReady, startKitchenOrder, toggleOrderItemDone } from '@/features/ordering/actions/updateOrderStatus';
import { LiveOrder, useLiveOrders } from '@/features/ordering/hooks/useLiveOrders';
import { supabase } from '@/features/ordering/lib/supabase';

type SettingsState = {
    restaurant_name?: string;
    address?: string;
    print_kot?: boolean;
    auto_print_on_accept?: boolean;
    printer_name?: string;
} | null;

export interface KDSSettings {
    ticketView: 'grid' | 'list' | 'allday';
    fontSize: 'sm' | 'md' | 'lg';
    autoBump: boolean; // auto-remove ready tickets after 30s
    timerDirection: 'up' | 'down';
    yellowThreshold: number; // minutes, default 10
    redThreshold: number; // minutes, default 20
    soundNewOrder: boolean;
    soundOverdue: boolean;
    prepTimes: Record<string, number>; // category name → minutes
    autoPrintOnConfirm: boolean; // default false
    printEnabled: boolean; // default true
    printerName: string; // optional
}

export interface AllDayItem {
    name: string;
    is_veg?: boolean;
    totalQty: number;
    tables: string[];
}

const DEFAULT_KDS_SETTINGS: KDSSettings = {
    ticketView: 'grid',
    fontSize: 'md',
    autoBump: true,
    timerDirection: 'up',
    yellowThreshold: 10,
    redThreshold: 20,
    soundNewOrder: true,
    soundOverdue: true,
    autoPrintOnConfirm: false,
    printEnabled: true,
    printerName: '',
    prepTimes: {
        Soups: 8,
        Starters: 12,
        Tandoori: 20,
        Biriyani: 25,
        Curries: 18,
        Breads: 5,
        Beverages: 3,
    },
};

const STATION_ROUTING_MAP: Record<string, string[]> = {
    'Tandoor & Grill': ['Tandoori', 'Kebabs & Tikka', 'Grill Specialties'],
    'Curries & Gravy': ['Curries', 'Veg Gravy', 'Non-Veg Gravy', 'Dal & Kadai'],
    'Biriyani & Mandi': ['Biriyani', 'Mandi & Pulao', 'Rice Specials'],
    'Breads & Naan': ['Breads', 'Naan & Roti', 'Kulcha & Paratha'],
    Starters: ['Starters', 'Soups', 'Salads', 'Appetizers'],
    Beverages: ['Beverages', 'Drinks', 'Milkshakes', 'Ice Creams'],
};

function playPing(frequency = 880, duration = 0.4) {
    if (typeof window === 'undefined') return;
    try {
        const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;

        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    } catch (err) {
        console.error('Kitchen alert sound failed', err);
    }
}

export function printKOT(order: LiveOrder) {
    if (typeof window === 'undefined') return;
    const kotNo = order.id.slice(0, 4).toUpperCase();
    const tableNo = order.restaurant_tables?.table_no ?? '?';
    const customerName = order.customer_name ?? 'Guest';
    const timeStr = new Date(order.created_at).toLocaleTimeString('en-IN');

    const printContent = `
    <html>
    <head>
      <title>KOT #${kotNo}</title>
      <style>
        @media print {
          body { font-family: monospace; width: 80mm; margin: 0; padding: 8px; }
          .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
          .hotel-name { font-size: 18px; font-weight: bold; }
          .kot-no { font-size: 14px; margin: 4px 0; font-weight: bold; }
          .table-info { font-size: 13px; }
          .items { margin: 8px 0; }
          .item-row { display: flex; justify-content: space-between; font-size: 13px; padding: 3px 0; font-weight: bold; }
          .item-name { flex: 1; }
          .item-qty { width: 35px; text-align: right; }
          .notes { font-size: 11px; color: #333; font-style: italic; padding-left: 12px; margin-bottom: 4px; }
          .footer { border-top: 1px dashed #000; margin-top: 8px; padding-top: 8px; text-align: center; font-size: 11px; }
          .veg-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; border: 1px solid #000; }
          .veg { background: green; }
          .nonveg { background: red; }
        }
        body { font-family: monospace; width: 300px; margin: 0 auto; padding: 16px; color: #000; background: #fff; }
        .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
        .hotel-name { font-size: 18px; font-weight: bold; }
        .kot-no { font-size: 14px; margin: 4px 0; font-weight: bold; }
        .table-info { font-size: 13px; }
        .items { margin: 8px 0; }
        .item-row { display: flex; justify-content: space-between; font-size: 13px; padding: 3px 0; font-weight: bold; }
        .item-name { flex: 1; }
        .item-qty { width: 35px; text-align: right; }
        .notes { font-size: 11px; color: #333; font-style: italic; padding-left: 12px; margin-bottom: 4px; }
        .footer { border-top: 1px dashed #000; margin-top: 8px; padding-top: 8px; text-align: center; font-size: 11px; }
        .veg-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; border: 1px solid #000; }
        .veg { background: green; }
        .nonveg { background: red; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="hotel-name">HOTEL TAJ OOTY</div>
        <div class="kot-no">KOT #${kotNo}</div>
        <div class="table-info">Table: T-${tableNo} | ${customerName}</div>
        <div class="table-info">${timeStr}</div>
      </div>
      <div class="items">
        ${(order.order_items || []).map((item) => `
          <div class="item-row">
            <div>
              <span class="veg-dot ${item.menu_items?.is_veg ? 'veg' : 'nonveg'}"></span>
              <span class="item-name">${item.menu_items?.name ?? 'Unknown Item'}</span>
            </div>
            <span class="item-qty">×${item.qty}</span>
          </div>
          ${item.notes ? `<div class="notes">⚠ ${item.notes}</div>` : ''}
        `).join('')}
      </div>
      <div class="footer">
        Printed: ${new Date().toLocaleTimeString('en-IN')}<br/>
        ** KITCHEN COPY **
      </div>
    </body>
    </html>
    `;

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
}

function getStatusTimestamp(order: LiveOrder, status: string) {
    const matches = order.order_status_history?.filter((entry) => entry.status === status) ?? [];
    const latest = matches.sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime())[0];
    return latest?.changed_at ?? order.created_at;
}

function formatElapsed(from: string, now: number) {
    const diffSeconds = Math.max(0, Math.floor((now - new Date(from).getTime()) / 1000));
    const minutes = Math.floor(diffSeconds / 60);
    const seconds = diffSeconds % 60;
    return {
        label: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
        overdue: diffSeconds >= 15 * 60,
    };
}

export function KitchenDash() {
    const { orders, setOrders, loading, refetch: refetchOrders } = useLiveOrders(['confirmed', 'preparing', 'ready', 'on_hold', 'served', 'billed', 'cancelled']);
    const [settings, setSettings] = useState<SettingsState>(null);
    const [kdsSettings, setKdsSettings] = useState<KDSSettings>(() => {
        if (typeof window === 'undefined') return DEFAULT_KDS_SETTINGS;
        try {
            const saved = localStorage.getItem('kds_settings');
            if (saved) {
                const parsed = JSON.parse(saved);
                return {
                    ...DEFAULT_KDS_SETTINGS,
                    ...parsed,
                    prepTimes: { ...DEFAULT_KDS_SETTINGS.prepTimes, ...parsed?.prepTimes },
                };
            }
        } catch {
            // ignore
        }
        return DEFAULT_KDS_SETTINGS;
    });
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);
    const [now, setNow] = useState(() => Date.now());
    const seenConfirmedRef = useRef<Set<string>>(new Set());
    const alertedOverdueRef = useRef<Set<string>>(new Set());

    const [activeFilter, setActiveFilter] = useState<string>('All');
    const [activeStation, setActiveStation] = useState<string>('All Stations');
    const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
    const [isConnected, setIsConnected] = useState<boolean>(true);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

    const [itemStatuses, setItemStatuses] = useState<Record<string, boolean>>({});

    const refetchItemStatuses = useCallback(async () => {
        const { data, error } = await supabase
            .from('order_item_status')
            .select('order_item_id, is_done');
        if (!error && data) {
            const mapping: Record<string, boolean> = {};
            data.forEach((row: { order_item_id: string; is_done: boolean }) => {
                mapping[row.order_item_id] = row.is_done;
            });
            setItemStatuses(mapping);
        }
    }, []);

    useEffect(() => {
        let active = true;
        supabase
            .from('order_item_status')
            .select('order_item_id, is_done')
            .then(({ data, error }) => {
                if (!error && data && active) {
                    const mapping: Record<string, boolean> = {};
                    data.forEach((row: { order_item_id: string; is_done: boolean }) => {
                        mapping[row.order_item_id] = row.is_done;
                    });
                    setItemStatuses(mapping);
                }
            });
        return () => { active = false; };
    }, [orders]);

    const handleToggleItemStatus = useCallback(async (orderItemId: string, currentlyChecked: boolean) => {
        const nextChecked = !currentlyChecked;
        setItemStatuses((prev) => ({ ...prev, [orderItemId]: nextChecked }));
        await toggleOrderItemDone(orderItemId, nextChecked);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen()
                .then(() => setIsFullscreen(true))
                .catch(() => {});
        } else {
            document.exitFullscreen()
                .then(() => setIsFullscreen(false))
                .catch(() => {});
        }
    };

    const formattedClock = useMemo(() => {
        const d = new Date(now);
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        const ss = String(d.getSeconds()).padStart(2, '0');
        return `${hh}:${mm}:${ss}`;
    }, [now]);

    const filters = ['All', 'New', 'Preparing', 'Ready', 'On Hold', 'History'] as const;

    // Filter orders by activeStation first
    const stationFilteredOrders = useMemo(() => {
        if (activeStation === 'All Stations') return orders;
        const allowedCategories = STATION_ROUTING_MAP[activeStation] || [];
        if (allowedCategories.length === 0) return orders;

        return orders.filter((o) =>
            o.order_items?.some((item) => {
                const catName = item.menu_items?.category_id || '';
                return allowedCategories.includes(catName);
            })
        );
    }, [orders, activeStation]);

    const filterCounts = useMemo(() => {
        return {
            'All': stationFilteredOrders.length,
            'New': stationFilteredOrders.filter(o => o.status === 'confirmed').length,
            'Preparing': stationFilteredOrders.filter(o => o.status === 'preparing').length,
            'Ready': stationFilteredOrders.filter(o => o.status === 'ready').length,
            'On Hold': stationFilteredOrders.filter(o => o.status === 'on_hold').length,
            'History': stationFilteredOrders.filter(o => ['served', 'billed', 'cancelled'].includes(o.status) || (o.status === 'ready' && kdsSettings.autoBump && (now - new Date(getStatusTimestamp(o, 'ready')).getTime() >= 30_000))).length,
        };
    }, [stationFilteredOrders, kdsSettings.autoBump, now]);

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        let mounted = true;
        fetchRestaurantSettings().then((result) => {
            if (!mounted) return;
            if (result.success && result.data) {
                setSettings(result.data);
                if (result.data.kds_config) {
                    const cfg = result.data.kds_config as Partial<KDSSettings>;
                    setKdsSettings((prev) => ({
                        ...prev,
                        ...cfg,
                        prepTimes: { ...prev.prepTimes, ...cfg?.prepTimes },
                    }));
                }
            }
        });
        return () => {
            mounted = false;
        };
    }, []);

    const handleSaveSettings = async (newSettings: KDSSettings) => {
        setSavingSettings(true);
        try {
            localStorage.setItem('kds_settings', JSON.stringify(newSettings));
            setKdsSettings(newSettings);
            await saveKdsConfig({
                prepTimes: newSettings.prepTimes,
                stationRouting: STATION_ROUTING_MAP,
                ticketView: newSettings.ticketView,
                fontSize: newSettings.fontSize,
                autoBump: newSettings.autoBump,
                timerDirection: newSettings.timerDirection,
                yellowThreshold: newSettings.yellowThreshold,
                redThreshold: newSettings.redThreshold,
                soundNewOrder: newSettings.soundNewOrder,
                soundOverdue: newSettings.soundOverdue,
            });
            setIsSettingsOpen(false);
        } finally {
            setSavingSettings(false);
        }
    };

    const confirmedOrders = useMemo(
        () => stationFilteredOrders
            .filter((order) => order.status === 'confirmed' && (activeFilter === 'All' || activeFilter === 'New'))
            .sort((a, b) => new Date(getStatusTimestamp(a, 'confirmed')).getTime() - new Date(getStatusTimestamp(b, 'confirmed')).getTime()),
        [stationFilteredOrders, activeFilter]
    );

    const preparingOrders = useMemo(
        () => stationFilteredOrders
            .filter((order) => order.status === 'preparing' && (activeFilter === 'All' || activeFilter === 'Preparing'))
            .sort((a, b) => new Date(getStatusTimestamp(a, 'confirmed')).getTime() - new Date(getStatusTimestamp(b, 'confirmed')).getTime()),
        [stationFilteredOrders, activeFilter]
    );

    const recentReadyOrders = useMemo(
        () => stationFilteredOrders
            .filter((order) => order.status === 'ready' && (activeFilter === 'All' || activeFilter === 'Ready'))
            .filter((order) => !kdsSettings.autoBump || (now - new Date(getStatusTimestamp(order, 'ready')).getTime() < 30_000))
            .sort((a, b) => new Date(getStatusTimestamp(b, 'ready')).getTime() - new Date(getStatusTimestamp(a, 'ready')).getTime()),
        [now, stationFilteredOrders, activeFilter, kdsSettings.autoBump]
    );

    const onHoldOrders = useMemo(
        () => stationFilteredOrders
            .filter((order) => order.status === 'on_hold' && (activeFilter === 'All' || activeFilter === 'On Hold'))
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
        [stationFilteredOrders, activeFilter]
    );

    const completedOrders = useMemo(
        () => stationFilteredOrders
            .filter((order) => (activeFilter === 'All' || activeFilter === 'History' || activeFilter === 'Completed') && (['served', 'billed', 'cancelled'].includes(order.status) || (order.status === 'ready' && kdsSettings.autoBump && (now - new Date(getStatusTimestamp(order, 'ready')).getTime() >= 30_000))))
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
        [stationFilteredOrders, activeFilter, kdsSettings.autoBump, now]
    );

    const allActiveOrders = useMemo(
        () => [...confirmedOrders, ...preparingOrders, ...recentReadyOrders, ...onHoldOrders],
        [confirmedOrders, preparingOrders, recentReadyOrders, onHoldOrders]
    );

    const allDayItems = useMemo(() => {
        return allActiveOrders
            .flatMap((order) => (order.order_items || []).map((item) => ({
                name: item.menu_items?.name || 'Unknown Item',
                is_veg: Boolean(item.menu_items?.is_veg),
                qty: item.qty || 1,
                tableNo: order.restaurant_tables?.table_no || 'N/A',
                orderId: order.id,
            })))
            .reduce((acc, item) => {
                const existing = acc.find((i) => i.name === item.name);
                if (existing) {
                    existing.totalQty += item.qty;
                    const tableStr = `T-${item.tableNo}`;
                    if (!existing.tables.includes(tableStr)) {
                        existing.tables.push(tableStr);
                    }
                } else {
                    acc.push({ name: item.name, is_veg: item.is_veg, totalQty: item.qty, tables: [`T-${item.tableNo}`] });
                }
                return acc;
            }, [] as AllDayItem[])
            .sort((a, b) => b.totalQty - a.totalQty);
    }, [allActiveOrders]);

    useEffect(() => {
        const nextIds = new Set(confirmedOrders.map((order) => order.id));
        confirmedOrders.forEach((order) => {
            if (!seenConfirmedRef.current.has(order.id)) {
                if (soundEnabled && kdsSettings.soundNewOrder) {
                    playPing(880);
                }
            }
        });
        seenConfirmedRef.current = nextIds;
    }, [confirmedOrders, soundEnabled, kdsSettings.soundNewOrder]);

    useEffect(() => {
        if (!soundEnabled || !kdsSettings.soundOverdue) return;
        const redMin = Number(kdsSettings.redThreshold || 20);
        allActiveOrders.forEach((order) => {
            if (order.status === 'ready') return;
            const elapsedTotalSec = Math.max(0, Math.floor((now - new Date(order.created_at).getTime()) / 1000));
            const elapsedMin = Math.floor(elapsedTotalSec / 60);
            if (elapsedMin >= redMin) {
                if (!alertedOverdueRef.current.has(order.id)) {
                    alertedOverdueRef.current.add(order.id);
                    playPing(440);
                }
            }
        });
    }, [now, allActiveOrders, soundEnabled, kdsSettings.soundOverdue, kdsSettings.redThreshold]);

    useEffect(() => {
        const channel = supabase
            .channel('kds-live')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'orders',
            }, async (payload) => {
                const newRow = payload.new as { id?: string; status?: string };
                const oldRow = payload.old as { status?: string };

                if (payload.eventType === 'UPDATE' &&
                    newRow.status === 'confirmed' &&
                    oldRow.status === 'pending' &&
                    kdsSettings.autoPrintOnConfirm &&
                    (kdsSettings.printEnabled ?? true) &&
                    newRow.id
                ) {
                    const { data: fullOrder } = await supabase
                        .from('orders')
                        .select(`
                            *,
                            restaurant_tables (*),
                            order_items (
                                *,
                                menu_items (name, is_veg, category_id)
                            )
                        `)
                        .eq('id', newRow.id)
                        .single();
                    if (fullOrder) {
                        printKOT(fullOrder as unknown as LiveOrder);
                    }
                }

                if (payload.eventType === 'INSERT' ||
                   (payload.eventType === 'UPDATE' &&
                    ['confirmed', 'preparing', 'ready', 'on_hold'].includes(newRow.status ?? ''))
                ) {
                    refetchOrders();
                    if (payload.eventType === 'INSERT' && soundEnabled && kdsSettings.soundNewOrder) {
                        playPing(880);
                    }
                }
            })
            .subscribe((status) => setIsConnected(status === 'SUBSCRIBED'));

        const itemStatusChannel = supabase
            .channel('kds-item-status')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'order_item_status'
            }, () => refetchItemStatuses())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            supabase.removeChannel(itemStatusChannel);
        };
    }, [refetchOrders, refetchItemStatuses, soundEnabled, kdsSettings.soundNewOrder, kdsSettings.autoPrintOnConfirm, kdsSettings.printEnabled]);

    useEffect(() => {
        if (!kdsSettings.autoBump) return;
        const interval = setInterval(() => {
            setOrders((prev) => prev.filter((o) => {
                if (o.status !== 'ready') return true;
                const readyTime = new Date(getStatusTimestamp(o, 'ready')).getTime();
                return Date.now() - readyTime < 30000;
            }));
        }, 1000);
        return () => clearInterval(interval);
    }, [kdsSettings.autoBump, setOrders]);

    if (loading) {
        return (
            <div className="flex items-center justify-center rounded-3xl bg-[#F6EEDF] p-12">
                <div className="text-center text-[#4E1414]">
                    <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-[#C9974A]" />
                    <p className="font-bold">Syncing KOT tickets...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full min-h-screen bg-[#241B15]">
            {/* Header (sticky, bg-[#1a0a0a], h-14) */}
            <header className="sticky top-0 z-40 bg-[#1a0a0a] h-14 border-b border-[#C9974A]/20 px-4 lg:px-6 flex items-center justify-between shadow-md">
                {/* Left: "🍳 Kitchen Display" text white + station dropdown */}
                <div className="flex items-center gap-3">
                    <Link href="/staff/dashboard" title="Back to Stations Hub" className="text-white hover:text-[#C9974A] transition-colors font-bold text-xs bg-[#2a0f0f] px-2 py-1 rounded border border-[#C9974A]/30">
                        ← Hub
                    </Link>
                    <h1 className="text-white font-black text-base md:text-lg tracking-wide flex items-center gap-2 select-none">
                        🍳 Kitchen Display
                    </h1>
                    
                    <select
                        value={activeStation}
                        onChange={(e) => setActiveStation(e.target.value)}
                        className="bg-[#350C0C] text-[#C9974A] border border-[#C9974A]/40 rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm focus:outline-none focus:ring-1 focus:ring-[#C9974A] cursor-pointer transition-colors hover:bg-[#4E1414]"
                    >
                        <option value="All Stations">All Stations</option>
                        <option value="Tandoor & Grill">Tandoor & Grill</option>
                        <option value="Curries & Gravy">Curries & Gravy</option>
                        <option value="Biriyani & Mandi">Biriyani & Mandi</option>
                        <option value="Breads & Naan">Breads & Naan</option>
                        <option value="Starters">Starters</option>
                        <option value="Beverages">Beverages</option>
                    </select>
                    {/* Note: selecting a station filters tickets to only that station's categories (mapping defined in Prompt 5) */}
                </div>

                {/* Center: live clock HH:MM:SS updating every second, white, monospace font */}
                <div className="text-white font-mono font-bold text-base md:text-lg tracking-widest select-none hidden sm:block">
                    {formattedClock}
                </div>

                {/* Right: History Menu button + 🔇/🔊 sound toggle button + ⚙️ settings button + ⛶ fullscreen button + pulsing green dot */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setActiveFilter(activeFilter === 'History' ? 'All' : 'History')}
                        title="Open KOT Order History & Search"
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border shadow-sm active:scale-95 ${
                            activeFilter === 'History'
                                ? 'bg-[#C9974A] text-[#1a0a0a] border-[#C9974A] shadow-md scale-102'
                                : 'bg-[#2a0f0f] text-[#C9974A] border-[#C9974A]/30 hover:bg-[#3d1616]'
                        }`}
                    >
                        <History className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">History</span>
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-[#1a0a0a] text-[#C9974A]">
                            {completedOrders.length}
                        </span>
                    </button>

                    <button
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        title={soundEnabled ? "Mute Sound Alerts" : "Unmute Sound Alerts"}
                        className="flex items-center justify-center p-2 rounded-lg bg-[#2a0f0f] hover:bg-[#3d1616] text-[#C9974A] border border-[#C9974A]/30 transition-all shadow-sm active:scale-95"
                    >
                        {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-red-400" />}
                    </button>

                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        title="KDS Settings"
                        className="flex items-center justify-center p-2 rounded-lg bg-[#2a0f0f] hover:bg-[#3d1616] text-[#C9974A] border border-[#C9974A]/30 transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                        <Settings className="h-4 w-4" />
                    </button>

                    <button
                        onClick={toggleFullscreen}
                        title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                        className="flex items-center justify-center p-2 rounded-lg bg-[#2a0f0f] hover:bg-[#3d1616] text-[#C9974A] border border-[#C9974A]/30 transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </button>

                    <div
                        className={`flex items-center gap-1.5 ml-1 px-2.5 py-1 rounded-full text-[11px] font-black tracking-wider shadow-inner border ${
                            isConnected
                                ? 'bg-green-950/70 border-green-500/40 text-green-400'
                                : 'bg-red-950/70 border-red-500/40 text-red-400'
                        }`}
                        title={isConnected ? 'Realtime Connected' : 'Disconnected / Polling'}
                    >
                        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className="hidden md:inline">{isConnected ? 'LIVE' : 'OFFLINE'}</span>
                    </div>
                </div>
            </header>

            {/* Filter bar (below header, bg-[#2a0f0f], horizontal scroll) */}
            <div className="bg-[#2a0f0f] border-b border-[#C9974A]/20 px-4 py-2.5 overflow-x-auto flex items-center gap-2.5 no-scrollbar shadow-inner shrink-0">
                {filters.map((filter) => {
                    const isActive = activeFilter === filter;
                    const count = filterCounts[filter];
                    return (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={`flex items-center px-3.5 py-1.5 rounded-xl text-xs transition-all shrink-0 cursor-pointer ${
                                isActive
                                    ? 'bg-[#C9974A] text-[#1a0a0a] font-black shadow-md border border-[#C9974A] scale-102'
                                    : 'bg-[#1a0a0a]/80 text-[#F6EEDF] font-bold hover:bg-[#3d1616] border border-[#C9974A]/20'
                            }`}
                        >
                            <span>{filter}</span>
                            <span
                                className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-black ${
                                    isActive
                                        ? 'bg-[#1a0a0a] text-[#C9974A] shadow-2xs'
                                        : 'bg-[#2a0f0f] text-[#C9974A]'
                                }`}
                            >
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Ticket Columns */}
            <div
                className={`p-6 lg:p-8 grid gap-8 max-w-7xl mx-auto w-full ${
                    kdsSettings.fontSize === 'sm' ? 'text-sm' : kdsSettings.fontSize === 'lg' ? 'text-lg' : 'text-base'
                } ${
                    activeFilter === 'History'
                        ? 'grid-cols-1 max-w-6xl'
                        : kdsSettings.ticketView === 'list'
                        ? 'grid-cols-1 max-w-4xl'
                        : kdsSettings.ticketView === 'allday'
                        ? 'grid-cols-1 max-w-5xl'
                        : activeFilter === 'On Hold'
                        ? 'grid-cols-1 lg:grid-cols-3'
                        : (activeFilter === 'All' && onHoldOrders.length > 0)
                        ? 'grid-cols-1 lg:grid-cols-3'
                        : 'grid-cols-1 lg:grid-cols-2'
                }`}
            >
                {activeFilter === 'History' ? (
                    <HistoryMenu
                        completedOrders={completedOrders}
                        onPrintKOT={printKOT}
                    />
                ) : kdsSettings.ticketView === 'allday' ? (
                    <div className="bg-[#241B15] border border-[#C9974A]/30 rounded-2xl p-6 shadow-xl w-full">
                        <div className="flex items-center justify-between border-b border-[#C9974A]/20 pb-4 mb-5">
                            <div className="flex items-center gap-3">
                                <ChefHat className="h-6 w-6 text-[#C9974A]" />
                                <h2 className="text-xl font-black text-white tracking-wide">
                                    All-Day View — {allDayItems.reduce((acc, i) => acc + i.totalQty, 0)} items across {allActiveOrders.length} active orders
                                </h2>
                            </div>
                            <div className="text-xs font-bold text-[#C9974A] bg-[#1a0a0a] px-3 py-1.5 rounded-xl border border-[#C9974A]/20">
                                {allDayItems.length} Unique Dishes
                            </div>
                        </div>

                        {allDayItems.length === 0 ? (
                            <div className="p-12 text-center text-gray-400 font-bold italic border border-dashed border-[#C9974A]/20 rounded-xl">
                                No active order items across the kitchen right now.
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-[#C9974A]/20 bg-[#1a0a0a]">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-[#C9974A]/20 bg-[#2a0f0f] text-[#C9974A] text-xs font-black uppercase tracking-wider">
                                            <th className="py-3.5 px-4 w-16 text-center">Indicator</th>
                                            <th className="py-3.5 px-4">Item Name</th>
                                            <th className="py-3.5 px-4 w-28 text-center">Total</th>
                                            <th className="py-3.5 px-4">Tables</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#C9974A]/10 text-sm font-bold text-[#F6EEDF]">
                                        {allDayItems.map((item) => (
                                            <tr key={item.name} className="hover:bg-[#2a0f0f]/60 transition-colors">
                                                <td className="py-3 px-4 text-center">
                                                    <span className="text-base" title={item.is_veg ? 'Veg' : 'Non-Veg'}>
                                                        {item.is_veg ? '🟢' : '🔴'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 font-black text-white text-base">
                                                    {item.name}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-lg bg-[#C9974A] text-[#1a0a0a] font-black text-sm shadow-xs">
                                                        {item.totalQty}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-gray-300 font-mono text-xs tracking-wider">
                                                    {item.tables.join(', ')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {(activeFilter === 'All' || activeFilter === 'New') && (
                            <TicketColumn
                                title="Confirmed Tickets (Queue)"
                                subtitle="New orders waiting for the kitchen"
                                icon={<Volume2 className="h-4 w-4" />}
                                count={confirmedOrders.length}
                                emptyText="No confirmed tickets in the queue."
                                dark={false}
                            >
                                {confirmedOrders.map((order) => (
                                    <KitchenTicketCard
                                        key={order.id}
                                        order={order}
                                        mode="confirmed"
                                        now={now}
                                        settings={settings}
                                        kdsSettings={kdsSettings}
                                        itemStatuses={itemStatuses}
                                        onToggleItemStatus={handleToggleItemStatus}
                                    />
                                ))}
                            </TicketColumn>
                        )}

                        {(activeFilter === 'All' || activeFilter === 'Preparing' || activeFilter === 'Ready') && (
                            <TicketColumn
                                title="Actively Preparing"
                                subtitle="Live KOTs in progress and recently completed"
                                icon={<ChefHat className="h-4 w-4" />}
                                count={preparingOrders.length}
                                extraBadge={recentReadyOrders.length > 0 ? `${recentReadyOrders.length} ready` : undefined}
                                emptyText="No tickets in the preparing lane."
                                dark={false}
                            >
                                {preparingOrders.map((order) => (
                                    <KitchenTicketCard
                                        key={order.id}
                                        order={order}
                                        mode="preparing"
                                        now={now}
                                        settings={settings}
                                        kdsSettings={kdsSettings}
                                        itemStatuses={itemStatuses}
                                        onToggleItemStatus={handleToggleItemStatus}
                                    />
                                ))}

                                {recentReadyOrders.length > 0 && (
                                    <div className="space-y-3 pt-2">
                                        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#C9974A]">
                                            Recently Ready
                                        </p>
                                        {recentReadyOrders.map((order) => (
                                            <KitchenTicketCard
                                                key={order.id}
                                                order={order}
                                                mode="ready"
                                                now={now}
                                                settings={settings}
                                                kdsSettings={kdsSettings}
                                                itemStatuses={itemStatuses}
                                                onToggleItemStatus={handleToggleItemStatus}
                                            />
                                        ))}
                                    </div>
                                )}
                            </TicketColumn>
                        )}

                        {((activeFilter === 'All' && onHoldOrders.length > 0) || activeFilter === 'On Hold') && (
                            <TicketColumn
                                title="On Hold Tickets"
                                subtitle="Orders temporarily paused"
                                icon={<Loader2 className="h-4 w-4" />}
                                count={onHoldOrders.length}
                                emptyText="No tickets currently on hold."
                                dark={false}
                            >
                                {onHoldOrders.map((order) => (
                                    <KitchenTicketCard
                                        key={order.id}
                                        order={order}
                                        mode="on_hold"
                                        now={now}
                                        settings={settings}
                                        kdsSettings={kdsSettings}
                                        itemStatuses={itemStatuses}
                                        onToggleItemStatus={handleToggleItemStatus}
                                    />
                                ))}
                            </TicketColumn>
                        )}
                    </>
                )}
            </div>

            <SettingsDrawer
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                settings={kdsSettings}
                onSave={handleSaveSettings}
                saving={savingSettings}
            />
        </div>
    );
}

function TicketColumn({
    title,
    subtitle,
    icon,
    count,
    extraBadge,
    emptyText,
    dark,
    children,
}: {
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    count: number;
    extraBadge?: string;
    emptyText: string;
    dark?: boolean;
    children: React.ReactNode;
}) {
    const childCount = Array.isArray(children) ? children.filter(Boolean).length : children ? 1 : 0;

    return (
        <section className={`rounded-[28px] border p-6 shadow-xl ${dark ? 'border-[#C9974A]/25 bg-[#4E0202]' : 'border-[#C9974A]/20 bg-[#F6EEDF]'}`}>
            <div className={`mb-6 flex items-start justify-between border-b pb-4 ${dark ? 'border-[#C9974A]/15' : 'border-[#4E1414]/10'}`}>
                <div>
                    <h2 className={`flex items-center gap-2 text-xl font-black ${dark ? 'text-[#F6EEDF]' : 'text-[#4E1414]'}`}>
                        {icon}
                        {title}
                    </h2>
                    <p className={`mt-1 text-sm ${dark ? 'text-[#F6EEDF]/60' : 'text-[#241B15]/55'}`}>{subtitle}</p>
                </div>
                <div className="flex items-center gap-2">
                    {extraBadge && (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-green-700">
                            {extraBadge}
                        </span>
                    )}
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${dark ? 'bg-[#C9974A] text-[#241B15]' : 'bg-[#4E1414] text-[#F6EEDF]'}`}>
                        {count}
                    </span>
                </div>
            </div>

            <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {children}
                </AnimatePresence>
                {childCount === 0 && (
                    <div className={`rounded-2xl border border-dashed p-8 text-center text-sm italic ${dark ? 'border-[#C9974A]/20 text-[#F6EEDF]/40' : 'border-[#4E1414]/10 text-[#241B15]/30'}`}>
                        {emptyText}
                    </div>
                )}
            </div>
        </section>
    );
}

function HistoryMenu({
    completedOrders,
    onPrintKOT,
}: {
    completedOrders: LiveOrder[];
    onPrintKOT: (order: LiveOrder) => void;
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'SERVED' | 'BILLED' | 'CANCELLED'>('ALL');
    const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});

    const toggleExpand = (id: string) => {
        setExpandedOrderIds((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const filtered = useMemo(() => {
        return completedOrders.filter((o) => {
            if (statusFilter !== 'ALL' && o.status !== statusFilter.toLowerCase()) {
                return false;
            }
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            const kotNo = (o.id.substring(0, 4) ?? '').toLowerCase();
            const tableNo = String(o.restaurant_tables?.table_no ?? '').toLowerCase();
            const custName = (o.customer_name ?? '').toLowerCase();
            const itemMatch = (o.order_items || []).some((i) =>
                (i.menu_items?.name ?? '').toLowerCase().includes(q)
            );
            return kotNo.includes(q) || tableNo.includes(q) || custName.includes(q) || itemMatch;
        });
    }, [completedOrders, searchQuery, statusFilter]);

    return (
        <div className="bg-[#241B15] border border-[#C9974A]/30 rounded-2xl p-6 shadow-2xl w-full max-w-6xl mx-auto space-y-6">
            {/* Header & Search Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#C9974A]/20 pb-5">
                <div className="flex items-center gap-3">
                    <History className="h-6 w-6 text-[#C9974A]" />
                    <div>
                        <h2 className="text-xl font-black text-white tracking-wide">
                            KOT Order History & Archive
                        </h2>
                        <p className="text-xs text-gray-400 font-semibold mt-0.5">
                            Search and inspect previously completed, served, billed, and cancelled kitchen orders
                        </p>
                    </div>
                </div>

                {/* Search Bar & Status Pills */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative min-w-[260px]">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search KOT#, Table, Item, or Customer..."
                            className="w-full bg-[#1a0a0a] text-white placeholder-gray-500 pl-10 pr-8 py-2 rounded-xl text-xs font-semibold border border-[#C9974A]/30 focus:outline-none focus:border-[#C9974A] transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs font-bold cursor-pointer"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Status Filter Pills */}
                    <div className="flex items-center gap-1.5 bg-[#1a0a0a] p-1 rounded-xl border border-[#C9974A]/20">
                        {(['ALL', 'SERVED', 'BILLED', 'CANCELLED'] as const).map((st) => (
                            <button
                                key={st}
                                onClick={() => setStatusFilter(st)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                                    statusFilter === st
                                        ? 'bg-[#C9974A] text-[#1a0a0a]'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                {st}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* List of Orders */}
            {filtered.length === 0 ? (
                <div className="p-12 text-center text-gray-400 font-bold italic border border-dashed border-[#C9974A]/20 rounded-xl bg-[#1a0a0a]/50">
                    No orders matching your search or filter criteria.
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((o) => {
                        const isExpanded = Boolean(expandedOrderIds[o.id]);
                        const items = o.order_items || [];
                        const itemSummary = items
                            .map((i) => `${i.qty}× ${i.menu_items?.name || 'Item'}`)
                            .join(', ');
                        const shortId = o.id.substring(0, 4).toUpperCase();
                        const tableNo = o.restaurant_tables?.table_no || 'N/A';
                        const timeStr = new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                        let statusBadge = (
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase bg-green-950 text-green-400 border border-green-500/30">
                                🟢 Served
                            </span>
                        );
                        if (o.status === 'billed') {
                            statusBadge = (
                                <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase bg-blue-950 text-blue-400 border border-blue-500/30">
                                    🔵 Billed
                                </span>
                            );
                        } else if (o.status === 'cancelled') {
                            statusBadge = (
                                <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase bg-red-950 text-red-400 border border-red-500/30">
                                    🔴 Cancelled
                                </span>
                            );
                        } else if (o.status === 'ready') {
                            statusBadge = (
                                <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase bg-amber-950 text-amber-400 border border-amber-500/30">
                                    🟡 Ready / Picked Up
                                </span>
                            );
                        }

                        return (
                            <div
                                key={o.id}
                                className="bg-[#1a0a0a] border border-[#C9974A]/20 rounded-xl p-4 transition-all hover:border-[#C9974A]/40 shadow-sm"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    {/* Left: Status, KOT#, Table, Time */}
                                    <div className="flex items-center gap-3 flex-wrap">
                                        {statusBadge}
                                        <div className="flex items-center gap-2 font-black text-white text-sm">
                                            <span>KOT #{shortId}</span>
                                            <span className="text-gray-600">•</span>
                                            <span className="text-[#C9974A] bg-[#2a0f0f] px-2 py-0.5 rounded border border-[#C9974A]/30 text-xs">
                                                Table T-{tableNo}
                                            </span>
                                        </div>
                                        {o.customer_name && (
                                            <span className="text-gray-400 text-xs font-bold">
                                                ({o.customer_name})
                                            </span>
                                        )}
                                        <span className="text-gray-500 text-xs font-mono">
                                            {timeStr}
                                        </span>
                                    </div>

                                    {/* Center: Item summary preview */}
                                    <div className="flex-1 text-xs text-gray-300 font-semibold truncate sm:px-4 max-w-md">
                                        {itemSummary}
                                    </div>

                                    {/* Right: Actions */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => onPrintKOT(o)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2a0f0f] hover:bg-[#3d1616] text-[#C9974A] border border-[#C9974A]/30 text-xs font-bold transition-all cursor-pointer"
                                            title="Print receipt / KOT copy"
                                        >
                                            <Printer className="w-3.5 h-3.5" />
                                            <span>Print</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => toggleExpand(o.id)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold transition-all cursor-pointer"
                                        >
                                            <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
                                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded item breakdown */}
                                {isExpanded && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="mt-4 pt-4 border-t border-[#C9974A]/15 space-y-3"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-[#241B15]/80 p-3.5 rounded-xl border border-[#C9974A]/10 space-y-2">
                                                <div className="text-[11px] font-black uppercase text-[#C9974A] tracking-wider pb-1 border-b border-[#C9974A]/10">
                                                    Order Items Breakdown ({items.length})
                                                </div>
                                                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                                    {items.map((it) => (
                                                        <div key={it.id} className="flex items-center justify-between text-xs py-1 border-b border-gray-800/40 last:border-0">
                                                            <div className="flex items-center gap-2 font-bold text-gray-200">
                                                                <span className={`w-2 h-2 rounded-full ${it.menu_items?.is_veg ? 'bg-green-500' : 'bg-red-500'}`} />
                                                                <span>{it.menu_items?.name || 'Item'}</span>
                                                                {it.notes && (
                                                                    <span className="text-[10px] text-amber-400 bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-500/30 font-semibold">
                                                                        ⚠ {it.notes}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="font-mono font-black text-gray-300">
                                                                ×{it.qty}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="bg-[#241B15]/80 p-3.5 rounded-xl border border-[#C9974A]/10 flex flex-col justify-between space-y-3">
                                                <div className="text-[11px] font-black uppercase text-[#C9974A] tracking-wider pb-1 border-b border-[#C9974A]/10">
                                                    Order Metadata
                                                </div>
                                                <div className="space-y-1.5 text-xs text-gray-300 font-medium">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500">Order ID:</span>
                                                        <span className="font-mono text-white">{o.id}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500">Created At:</span>
                                                        <span className="text-white font-mono">{new Date(o.created_at).toLocaleString()}</span>
                                                    </div>
                                                    {o.order_status_history && o.order_status_history.length > 0 && (
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-500">Last Status Update:</span>
                                                            <span className="text-white font-mono">{new Date(o.order_status_history[o.order_status_history.length - 1].changed_at).toLocaleTimeString()}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function KitchenTicketCard({
    order,
    mode: _mode,
    now,
    kdsSettings,
    itemStatuses,
    onToggleItemStatus,
}: {
    order: LiveOrder;
    mode?: 'confirmed' | 'preparing' | 'ready' | 'on_hold';
    now: number;
    settings?: SettingsState;
    kdsSettings?: KDSSettings;
    itemStatuses: Record<string, boolean>;
    onToggleItemStatus: (orderItemId: string, currentlyChecked: boolean) => Promise<void>;
}) {
    const [busy, setBusy] = useState(false);

    // Read thresholds & prep times from kdsSettings prop or fallback to localStorage / defaults
    const { yellowThresholdMin, redThresholdMin, categoryPrepTimes, timerDirection } = useMemo(() => {
        if (kdsSettings) {
            return {
                yellowThresholdMin: kdsSettings.yellowThreshold,
                redThresholdMin: kdsSettings.redThreshold,
                categoryPrepTimes: kdsSettings.prepTimes,
                timerDirection: kdsSettings.timerDirection,
            };
        }
        if (typeof window === 'undefined') {
            return { yellowThresholdMin: 10, redThresholdMin: 20, categoryPrepTimes: {} as Record<string, number>, timerDirection: 'up' as const };
        }
        try {
            const parsed = JSON.parse(localStorage.getItem('kds_settings') || '{}');
            return {
                yellowThresholdMin: Number(parsed.yellowThreshold || parsed.yellowThresholdMin || 10),
                redThresholdMin: Number(parsed.redThreshold || parsed.redThresholdMin || 20),
                categoryPrepTimes: (parsed.prepTimes || parsed.categoryPrepTimes || {}) as Record<string, number>,
                timerDirection: (parsed.timerDirection || 'up') as 'up' | 'down',
            };
        } catch {
            return { yellowThresholdMin: 10, redThresholdMin: 20, categoryPrepTimes: {}, timerDirection: 'up' as const };
        }
    }, [kdsSettings]);

    // Timer: counts up or down from created_at / prep time
    const elapsedInfo = formatElapsed(order.created_at, now);
    const elapsedTotalSec = Math.max(0, Math.floor((now - new Date(order.created_at).getTime()) / 1000));
    const elapsedMin = Math.floor(elapsedTotalSec / 60);

    const isOverdue = order.status !== 'ready' && elapsedMin >= redThresholdMin;
    const isYellow = order.status !== 'ready' && !isOverdue && elapsedMin >= yellowThresholdMin;

    // Border-left 4px colors and bg
    const getCardStyle = () => {
        if (isOverdue) {
            return { border: '!border-l-[#ef4444]', bg: '!bg-[#fff5f5]' };
        }
        switch (order.status) {
            case 'confirmed':
                return { border: '!border-l-[#22c55e]', bg: 'bg-white' };
            case 'preparing':
                return { border: '!border-l-[#eab308]', bg: 'bg-white' };
            case 'ready':
                return { border: '!border-l-[#3b82f6]', bg: 'bg-white' };
            case 'on_hold':
                return { border: '!border-l-[#9ca3af]', bg: 'bg-white' };
            default:
                return { border: '!border-l-gray-300', bg: 'bg-white' };
        }
    };

    const cardStyle = getCardStyle();

    const getTimerColor = () => {
        if (isOverdue) {
            return 'text-[#ef4444] font-black animate-pulse';
        }
        if (isYellow) {
            return 'text-[#d97706] font-bold';
        }
        return 'text-gray-700 font-semibold';
    };

    const timerColor = getTimerColor();

    // Est. ready time: created_at + max prep time of items in order
    const maxPrepTimeMin = useMemo(() => {
        if (!order.order_items || order.order_items.length === 0) return 15;
        let maxMin = 15;
        for (const item of order.order_items) {
            const catId = item.menu_items?.category_id || '';
            const min = categoryPrepTimes[catId] ? Number(categoryPrepTimes[catId]) : 15;
            if (min > maxMin) maxMin = min;
        }
        return maxMin;
    }, [order.order_items, categoryPrepTimes]);

    const timerText = useMemo(() => {
        if (timerDirection === 'down') {
            const remainingSec = maxPrepTimeMin * 60 - elapsedTotalSec;
            const absSec = Math.abs(remainingSec);
            const m = Math.floor(absSec / 60);
            const s = absSec % 60;
            return remainingSec < 0 ? `-${m}m ${s}s overdue` : `${m}m ${s}s left`;
        }
        return elapsedInfo.label;
    }, [timerDirection, maxPrepTimeMin, elapsedTotalSec, elapsedInfo.label]);

    const estReadyFormatted = useMemo(() => {
        const createdDate = new Date(order.created_at);
        if (isNaN(createdDate.getTime())) return 'N/A';
        const estDate = new Date(createdDate.getTime() + maxPrepTimeMin * 60 * 1000);
        const hh = String(estDate.getHours()).padStart(2, '0');
        const mm = String(estDate.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
    }, [order.created_at, maxPrepTimeMin]);

    const kotNumber = useMemo(() => {
        return order.id.slice(0, 4).toUpperCase();
    }, [order.id]);

    const handleItemToggle = async (orderItemId: string, currentlyChecked: boolean) => {
        setBusy(true);
        await onToggleItemStatus(orderItemId, currentlyChecked);
        setBusy(false);
    };

    return (
        <motion.article
            layout
            data-lane={_mode}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`rounded-[12px] border border-gray-200 border-l-4 p-4 shadow-md transition-all ${cardStyle.border} ${cardStyle.bg}`}
        >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-gray-200 pb-3 mb-3 text-[#1a0a0a]">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-black text-lg">
                            T-{order.restaurant_tables?.table_no ?? '?'}
                        </span>
                        <span className="font-bold text-sm text-gray-800 truncate max-w-[140px]">
                            {order.customer_name || 'Guest'}
                        </span>
                    </div>
                    <div className="text-xs font-bold text-gray-500 mt-1 flex items-center gap-2">
                        <span>KOT #{kotNumber}</span>
                        {(kdsSettings?.printEnabled ?? true) && (
                            <button
                                type="button"
                                onClick={() => printKOT(order)}
                                title="Print Kitchen KOT"
                                className="text-gray-400 hover:text-gray-700 transition-colors cursor-pointer p-0.5 rounded"
                            >
                                <Printer className="w-3.5 h-3.5 inline" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="text-right shrink-0">
                    <div className={`flex items-center justify-end gap-1.5 text-sm ${timerColor}`}>
                        <span className="text-[10px]">●</span>
                        <span>{timerText}</span>
                    </div>
                    <div className="text-xs font-semibold text-gray-500 mt-1">
                        Est: {estReadyFormatted}
                    </div>
                </div>
            </div>

            {/* Items List */}
            <div className="space-y-2.5 mb-4 text-[#1a0a0a]">
                {order.order_items?.map((item) => {
                    const isVeg = item.menu_items?.is_veg === true;
                    const hasNotes = item.notes && item.notes.trim() !== '';
                    const isWarningNote = hasNotes && /spicy|no onion|no garlic|jain|dairy/i.test(item.notes!);
                    const checked = itemStatuses[item.id] !== undefined ? itemStatuses[item.id] : ['ready', 'served'].includes(item.status ?? 'pending');

                    return (
                        <div key={item.id} className="border-b border-gray-100 last:border-b-0 pb-2 last:pb-0">
                            <div className="flex items-center justify-between text-sm gap-2">
                                <div className="flex items-center gap-2 overflow-hidden flex-1">
                                    {order.status === 'preparing' && (
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            disabled={busy}
                                            onChange={() => handleItemToggle(item.id, checked)}
                                            className="h-3.5 w-3.5 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500 cursor-pointer shrink-0"
                                            title="Check item off"
                                        />
                                    )}
                                    <span className="text-xs shrink-0 select-none" title={isVeg ? 'Veg' : 'Non-Veg'}>
                                        {isVeg ? '🟢' : '🔴'}
                                    </span>
                                    <span className={`font-bold text-gray-900 truncate ${checked ? 'line-through opacity-50' : ''}`}>
                                        {item.menu_items?.name ?? 'Unknown item'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 shrink-0 font-black">
                                    <span className="text-gray-800">×{item.qty}</span>
                                    <span className="text-gray-600 text-xs w-12 text-right">
                                        ₹{item.price_at_order * item.qty}
                                    </span>
                                </div>
                            </div>

                            {/* Notes field: if order_items.notes not empty → show below item in amber bg-amber-50 rounded pill, bold red if contains "spicy"/"no onion"/"no garlic"/"jain"/"dairy" */}
                            {hasNotes && (
                                <div
                                    className={`mt-1.5 px-2.5 py-1 rounded-lg flex items-center gap-1.5 border ${
                                        isWarningNote
                                            ? 'bg-amber-50 border-amber-300 text-[#ef4444] font-black'
                                            : 'bg-amber-50 border-amber-200 text-amber-900 font-semibold'
                                    } text-xs`}
                                >
                                    <span className="shrink-0 text-amber-600 font-bold">⚠</span>
                                    <span className="break-words">{item.notes}</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Button actions */}
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100">
                {(order.status === 'confirmed' || order.status === 'on_hold') && (
                    <button
                        type="button"
                        disabled={busy}
                        onClick={async () => {
                            setBusy(true);
                            await startKitchenOrder(order.id);
                            setBusy(false);
                        }}
                        className="col-span-2 flex items-center justify-center gap-1.5 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-black font-black py-2.5 px-3 text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flame className="w-3.5 h-3.5" />}
                        <span>{order.status === 'on_hold' ? '▶ Resume Prep' : '▶ Start Prep'}</span>
                    </button>
                )}

                {order.status === 'preparing' && (
                    <button
                        type="button"
                        disabled={busy}
                        onClick={async () => {
                            setBusy(true);
                            await markKitchenOrderReady(order.id);
                            setBusy(false);
                        }}
                        className="col-span-2 flex items-center justify-center gap-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-black py-2.5 px-3 text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        <span>✓ Mark Ready</span>
                    </button>
                )}

                {order.status !== 'on_hold' && order.status !== 'ready' && order.status !== 'served' && order.status !== 'billed' && order.status !== 'cancelled' && (
                    <button
                        type="button"
                        disabled={busy}
                        onClick={async () => {
                            setBusy(true);
                            await advanceOrderStatus(order.id, 'on_hold');
                            setBusy(false);
                        }}
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-3 text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                        <span>⏸ Hold</span>
                    </button>
                )}

                {order.status !== 'ready' && order.status !== 'served' && order.status !== 'billed' && order.status !== 'cancelled' && (
                    <button
                        type="button"
                        disabled={busy}
                        onClick={async () => {
                            if (window.confirm('Are you sure you want to cancel this order?')) {
                                setBusy(true);
                                await advanceOrderStatus(order.id, 'cancelled');
                                setBusy(false);
                            }
                        }}
                        className={`${order.status === 'on_hold' ? 'col-span-2' : ''} flex items-center justify-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer`}
                    >
                        <span>✕ Cancel</span>
                    </button>
                )}

                {order.status === 'ready' && (
                    <div className="col-span-2 flex items-center justify-center gap-2 rounded-lg bg-green-100 py-2.5 px-3 text-xs font-black text-green-700">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Ready for Waiter Pickup</span>
                    </div>
                )}

                {(order.status === 'served' || order.status === 'billed') && (
                    <div className="col-span-2 flex items-center justify-between rounded-lg bg-gray-800 py-2.5 px-3 text-xs font-bold text-gray-200">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-400" />
                            <span>Order Completed ({order.status.toUpperCase()})</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => printKOT(order)}
                            className="text-[#C9974A] hover:underline flex items-center gap-1 cursor-pointer font-black"
                        >
                            <Printer className="w-3.5 h-3.5" /> Re-print KOT
                        </button>
                    </div>
                )}

                {order.status === 'cancelled' && (
                    <div className="col-span-2 flex items-center justify-between rounded-lg bg-red-950/40 border border-red-500/20 py-2.5 px-3 text-xs font-bold text-red-400">
                        <span>✕ Order Cancelled</span>
                        <button
                            type="button"
                            onClick={() => printKOT(order)}
                            className="text-gray-400 hover:underline flex items-center gap-1 cursor-pointer font-black"
                        >
                            <Printer className="w-3.5 h-3.5" /> Print
                        </button>
                    </div>
                )}
            </div>
        </motion.article>
    );
}

function SettingsDrawer({
    isOpen,
    onClose,
    settings,
    onSave,
    saving,
}: {
    isOpen: boolean;
    onClose: () => void;
    settings: KDSSettings;
    onSave: (newSettings: KDSSettings) => void;
    saving: boolean;
}) {
    if (!isOpen) return null;

    return (
        <SettingsDrawerContent
            key="drawer-open"
            onClose={onClose}
            settings={settings}
            onSave={onSave}
            saving={saving}
        />
    );
}

function SettingsDrawerContent({
    onClose,
    settings,
    onSave,
    saving,
}: {
    onClose: () => void;
    settings: KDSSettings;
    onSave: (newSettings: KDSSettings) => void;
    saving: boolean;
}) {
    const [draft, setDraft] = useState<KDSSettings>(settings);

    const handlePrepTimeChange = (cat: string, val: number) => {
        const clamped = Math.max(1, Math.min(60, isNaN(val) ? 1 : val));
        setDraft((prev) => ({
            ...prev,
            prepTimes: {
                ...prev.prepTimes,
                [cat]: clamped,
            },
        }));
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 overflow-hidden">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
                />
                <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="w-screen max-w-md bg-[#1a0a0a] text-white shadow-2xl flex flex-col border-l border-[#C9974A]/30 overflow-hidden"
                    >
                        {/* Drawer Header */}
                        <div className="p-5 bg-[#2a0f0f] border-b border-[#C9974A]/20 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2.5">
                                <Settings className="w-5 h-5 text-[#C9974A]" />
                                <h2 className="text-lg font-black tracking-wide text-white">KDS Settings</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#3d1616] transition-colors cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Drawer Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-7 text-sm no-scrollbar">
                            {/* Section 1 — Display */}
                            <div className="space-y-4 bg-[#241B15] p-4 rounded-2xl border border-[#C9974A]/15 shadow-md">
                                <h3 className="font-black text-xs uppercase tracking-wider text-[#C9974A] border-b border-[#C9974A]/20 pb-2">
                                    Section 1 — Display
                                </h3>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-300">Ticket View</label>
                                    <div className="grid grid-cols-3 gap-1.5 bg-[#1a0a0a] p-1 rounded-xl border border-[#C9974A]/20">
                                        {(['grid', 'list', 'allday'] as const).map((v) => (
                                            <button
                                                key={v}
                                                type="button"
                                                onClick={() => setDraft((p) => ({ ...p, ticketView: v }))}
                                                className={`py-1.5 rounded-lg text-xs font-black capitalize transition-all cursor-pointer ${
                                                    draft.ticketView === v
                                                        ? 'bg-[#C9974A] text-[#1a0a0a] shadow-xs'
                                                        : 'text-gray-400 hover:text-white'
                                                }`}
                                            >
                                                {v === 'allday' ? 'All-Day' : v}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-300">Font Size</label>
                                    <div className="grid grid-cols-3 gap-1.5 bg-[#1a0a0a] p-1 rounded-xl border border-[#C9974A]/20">
                                        {(['sm', 'md', 'lg'] as const).map((s) => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => setDraft((p) => ({ ...p, fontSize: s }))}
                                                className={`py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${
                                                    draft.fontSize === s
                                                        ? 'bg-[#C9974A] text-[#1a0a0a] shadow-xs'
                                                        : 'text-gray-400 hover:text-white'
                                                }`}
                                            >
                                                {s === 'sm' ? 'S' : s === 'md' ? 'M' : 'L'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-[#C9974A]/10">
                                    <div>
                                        <div className="font-bold text-gray-200">Auto-bump Ready Tickets</div>
                                        <div className="text-[11px] text-gray-400">Remove from screen after 30 seconds</div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setDraft((p) => ({ ...p, autoBump: !p.autoBump }))}
                                        className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                                            draft.autoBump ? 'bg-[#C9974A]' : 'bg-gray-700'
                                        }`}
                                    >
                                        <div
                                            className={`w-5 h-5 rounded-full bg-white transition-transform ${
                                                draft.autoBump ? 'translate-x-5' : 'translate-x-0'
                                            }`}
                                        />
                                    </button>
                                </div>
                            </div>

                            {/* Section 2 — Timers & Alerts */}
                            <div className="space-y-4 bg-[#241B15] p-4 rounded-2xl border border-[#C9974A]/15 shadow-md">
                                <h3 className="font-black text-xs uppercase tracking-wider text-[#C9974A] border-b border-[#C9974A]/20 pb-2">
                                    Section 2 — Timers & Alerts
                                </h3>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-300">Timer Direction</label>
                                    <div className="grid grid-cols-2 gap-1.5 bg-[#1a0a0a] p-1 rounded-xl border border-[#C9974A]/20">
                                        {(['up', 'down'] as const).map((dir) => (
                                            <button
                                                key={dir}
                                                type="button"
                                                onClick={() => setDraft((p) => ({ ...p, timerDirection: dir }))}
                                                className={`py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                                    draft.timerDirection === dir
                                                        ? 'bg-[#C9974A] text-[#1a0a0a] shadow-xs'
                                                        : 'text-gray-400 hover:text-white'
                                                }`}
                                            >
                                                {dir === 'up' ? 'Count Up' : 'Count Down'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-1">
                                    <div>
                                        <label className="text-xs font-bold text-yellow-400 block mb-1">Yellow Alert (min)</label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={60}
                                            value={draft.yellowThreshold}
                                            onChange={(e) => setDraft((p) => ({ ...p, yellowThreshold: Number(e.target.value) }))}
                                            className="w-full bg-[#1a0a0a] border border-yellow-500/40 rounded-lg px-3 py-2 font-bold text-white focus:outline-none focus:border-yellow-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-red-400 block mb-1">Red Alert (min)</label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={60}
                                            value={draft.redThreshold}
                                            onChange={(e) => setDraft((p) => ({ ...p, redThreshold: Number(e.target.value) }))}
                                            className="w-full bg-[#1a0a0a] border border-red-500/40 rounded-lg px-3 py-2 font-bold text-white focus:outline-none focus:border-red-400"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3 pt-2 border-t border-[#C9974A]/10">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-gray-200">Sound on New Order</span>
                                        <button
                                            type="button"
                                            onClick={() => setDraft((p) => ({ ...p, soundNewOrder: !p.soundNewOrder }))}
                                            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                                                draft.soundNewOrder ? 'bg-[#C9974A]' : 'bg-gray-700'
                                            }`}
                                        >
                                            <div
                                                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                                                    draft.soundNewOrder ? 'translate-x-5' : 'translate-x-0'
                                                }`}
                                            />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-gray-200">Sound on Overdue</span>
                                        <button
                                            type="button"
                                            onClick={() => setDraft((p) => ({ ...p, soundOverdue: !p.soundOverdue }))}
                                            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                                                draft.soundOverdue ? 'bg-[#C9974A]' : 'bg-gray-700'
                                            }`}
                                        >
                                            <div
                                                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                                                    draft.soundOverdue ? 'translate-x-5' : 'translate-x-0'
                                                }`}
                                            />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3 — Prep Times per category */}
                            <div className="space-y-4 bg-[#241B15] p-4 rounded-2xl border border-[#C9974A]/15 shadow-md">
                                <h3 className="font-black text-xs uppercase tracking-wider text-[#C9974A] border-b border-[#C9974A]/20 pb-2">
                                    Section 3 — Prep Times per Category (min)
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {Object.entries(draft.prepTimes || {}).map(([category, minutes]) => (
                                        <div key={category} className="flex items-center justify-between bg-[#1a0a0a] px-3 py-2 rounded-xl border border-[#C9974A]/20">
                                            <span className="font-bold text-xs text-gray-200 truncate pr-2">{category}</span>
                                            <input
                                                type="number"
                                                min={1}
                                                max={60}
                                                value={minutes}
                                                onChange={(e) => handlePrepTimeChange(category, parseInt(e.target.value, 10))}
                                                className="w-14 bg-[#2a0f0f] border border-[#C9974A]/40 rounded-lg px-2 py-1 text-center font-black text-[#C9974A] text-xs focus:outline-none"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Section 4 — Station Routing */}
                            <div className="space-y-3 bg-[#241B15] p-4 rounded-2xl border border-[#C9974A]/15 shadow-md">
                                <h3 className="font-black text-xs uppercase tracking-wider text-[#C9974A] border-b border-[#C9974A]/20 pb-2">
                                    Section 4 — Station Routing
                                </h3>
                                <div className="space-y-2 text-xs">
                                    {Object.entries(STATION_ROUTING_MAP).map(([station, cats]) => (
                                        <div key={station} className="bg-[#1a0a0a] p-2.5 rounded-xl border border-[#C9974A]/20">
                                            <div className="font-black text-[#C9974A] mb-1">{station}</div>
                                            <div className="text-gray-400 font-medium leading-relaxed">
                                                {cats.join(', ')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[11px] text-amber-400/80 italic mt-2">
                                    * Station routing is configured in Admin → Settings
                                </p>
                            </div>

                            {/* Section 5 — Print */}
                            <div className="space-y-4 bg-[#241B15] p-4 rounded-2xl border border-[#C9974A]/15 shadow-md">
                                <h3 className="font-black text-xs uppercase tracking-wider text-[#C9974A] border-b border-[#C9974A]/20 pb-2">
                                    Print
                                </h3>
                                <div className="space-y-3 text-sm">
                                    <label className="flex items-center justify-between p-3 rounded-xl bg-[#1a0a0a] border border-[#C9974A]/20 cursor-pointer">
                                        <span className="font-bold text-gray-200">Enable printing</span>
                                        <div
                                            onClick={() => setDraft((p) => ({ ...p, printEnabled: !(p.printEnabled ?? true) }))}
                                            className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                                                (draft.printEnabled ?? true) ? 'bg-[#C9974A]' : 'bg-gray-700'
                                            }`}
                                        >
                                            <div
                                                className={`w-5 h-5 rounded-full bg-[#1a0a0a] transition-transform ${
                                                    (draft.printEnabled ?? true) ? 'translate-x-5' : 'translate-x-0'
                                                }`}
                                            />
                                        </div>
                                    </label>

                                    <label className="flex flex-col p-3 rounded-xl bg-[#1a0a0a] border border-[#C9974A]/20 cursor-pointer gap-1">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-gray-200">Auto-print on confirm</span>
                                            <div
                                                onClick={() => setDraft((p) => ({ ...p, autoPrintOnConfirm: !p.autoPrintOnConfirm }))}
                                                className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                                                    draft.autoPrintOnConfirm ? 'bg-[#C9974A]' : 'bg-gray-700'
                                                }`}
                                            >
                                                <div
                                                    className={`w-5 h-5 rounded-full bg-[#1a0a0a] transition-transform ${
                                                        draft.autoPrintOnConfirm ? 'translate-x-5' : 'translate-x-0'
                                                    }`}
                                                />
                                            </div>
                                        </div>
                                        <span className="text-xs text-gray-400 font-normal">
                                            When ON: prints KOT automatically when waiter confirms order
                                        </span>
                                    </label>

                                    <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-[#1a0a0a] border border-[#C9974A]/20">
                                        <span className="font-bold text-gray-200">Printer name (Optional)</span>
                                        <input
                                            type="text"
                                            placeholder="e.g. Kitchen-Thermal-80mm"
                                            value={draft.printerName ?? ''}
                                            onChange={(e) => setDraft((p) => ({ ...p, printerName: e.target.value }))}
                                            className="bg-[#2a0f0f] border border-[#C9974A]/30 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-[#C9974A]"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Drawer Footer */}
                        <div className="p-4 border-t border-[#C9974A]/20 bg-[#2a0f0f] flex items-center justify-end gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={saving}
                                className="px-4 py-2 rounded-xl bg-transparent hover:bg-white/5 text-gray-300 font-bold text-xs transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => onSave(draft)}
                                disabled={saving}
                                className="px-5 py-2.5 rounded-xl bg-[#C9974A] hover:bg-[#b5853b] text-[#1a0a0a] font-black text-xs transition-all shadow-md active:scale-95 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                            >
                                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                                <span>Save & Close</span>
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>
        </AnimatePresence>
    );
}
