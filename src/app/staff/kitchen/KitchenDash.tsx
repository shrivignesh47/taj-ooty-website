"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, CheckCircle2, Flame, Loader2, Printer, Volume2 } from 'lucide-react';
import { fetchRestaurantSettings } from '@/features/ordering/actions/adminActions';
import { markKitchenOrderReady, startKitchenOrder, updateKitchenItemStatus } from '@/features/ordering/actions/updateOrderStatus';
import { LiveOrder, useLiveOrders } from '@/features/ordering/hooks/useLiveOrders';

type SettingsState = {
    restaurant_name?: string;
    address?: string;
    print_kot?: boolean;
    auto_print_on_accept?: boolean;
    printer_name?: string;
} | null;

function playPingSound() {
    try {
        const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;

        const audioContext = new AudioCtx();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.001, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 0.03);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.35);

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.35);
    } catch (error) {
        console.error('Kitchen alert sound failed', error);
    }
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

function buildKotMarkup(order: LiveOrder, settings: SettingsState) {
    const confirmedAt = getStatusTimestamp(order, 'confirmed');
    const itemLines = order.order_items
        ?.map((item) => {
            const itemStatus = item.status ?? 'pending';
            return `
                <div class="item-row">
                    <div>
                        <span class="qty">${item.qty}x</span>
                        <span>${item.menu_items?.name ?? 'Unknown item'}</span>
                    </div>
                    <span class="status">${itemStatus.toUpperCase()}</span>
                </div>
            `;
        })
        .join('') ?? '';

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>KOT Table ${order.restaurant_tables?.table_no ?? '?'}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 16px; color: #241B15; }
                .wrap { max-width: 360px; margin: 0 auto; }
                .title { text-align: center; margin-bottom: 16px; }
                .brand { font-size: 20px; font-weight: 700; }
                .meta { font-size: 12px; color: #5f5144; margin-top: 4px; }
                .ticket { border: 2px dashed #4E1414; border-radius: 12px; padding: 16px; }
                .big { font-size: 28px; font-weight: 800; margin: 0 0 8px; }
                .line { border-top: 1px dashed #b89e78; margin: 12px 0; }
                .item-row { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 10px; font-size: 14px; }
                .qty { font-weight: 700; margin-right: 6px; }
                .status { font-size: 11px; color: #4E1414; font-weight: 700; }
                .footer { margin-top: 14px; font-size: 11px; color: #5f5144; }
            </style>
        </head>
        <body>
            <div class="wrap">
                <div class="title">
                    <div class="brand">${settings?.restaurant_name || 'Hotel Taj Ooty'}</div>
                    <div class="meta">${settings?.address || ''}</div>
                    <div class="meta">${settings?.printer_name ? `Printer: ${settings.printer_name}` : 'Kitchen Order Ticket'}</div>
                </div>
                <div class="ticket">
                    <p class="big">TABLE ${order.restaurant_tables?.table_no ?? '?'}</p>
                    <div class="meta">Customer: ${order.customer_name || 'Walk-in Guest'}</div>
                    <div class="meta">Confirmed: ${new Date(confirmedAt).toLocaleString()}</div>
                    <div class="meta">Ticket: ${order.id.slice(0, 8).toUpperCase()}</div>
                    <div class="line"></div>
                    ${itemLines}
                    <div class="line"></div>
                    <div class="footer">Generated at ${new Date().toLocaleString()}</div>
                </div>
            </div>
        </body>
        </html>
    `;
}

function printKot(order: LiveOrder, settings: SettingsState) {
    if (!settings?.print_kot) return;

    const popup = window.open('', '_blank', 'width=420,height=720');
    if (!popup) return;

    popup.document.open();
    popup.document.write(buildKotMarkup(order, settings));
    popup.document.close();

    setTimeout(() => {
        popup.focus();
        popup.print();
    }, 250);
}

export function KitchenDash() {
    const { orders, loading } = useLiveOrders(['confirmed', 'preparing', 'ready']);
    const [settings, setSettings] = useState<SettingsState>(null);
    const [now, setNow] = useState(Date.now());
    const seenConfirmedRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        fetchRestaurantSettings().then((result) => {
            if (result.success) {
                setSettings(result.data);
            }
        });
    }, []);

    const confirmedOrders = useMemo(
        () => orders
            .filter((order) => order.status === 'confirmed')
            .sort((a, b) => new Date(getStatusTimestamp(a, 'confirmed')).getTime() - new Date(getStatusTimestamp(b, 'confirmed')).getTime()),
        [orders]
    );

    const preparingOrders = useMemo(
        () => orders
            .filter((order) => order.status === 'preparing')
            .sort((a, b) => new Date(getStatusTimestamp(a, 'confirmed')).getTime() - new Date(getStatusTimestamp(b, 'confirmed')).getTime()),
        [orders]
    );

    const recentReadyOrders = useMemo(
        () => orders
            .filter((order) => order.status === 'ready')
            .filter((order) => now - new Date(getStatusTimestamp(order, 'ready')).getTime() < 30_000)
            .sort((a, b) => new Date(getStatusTimestamp(b, 'ready')).getTime() - new Date(getStatusTimestamp(a, 'ready')).getTime()),
        [now, orders]
    );

    useEffect(() => {
        const nextIds = new Set(confirmedOrders.map((order) => order.id));
        confirmedOrders.forEach((order) => {
            if (!seenConfirmedRef.current.has(order.id)) {
                playPingSound();
            }
        });
        seenConfirmedRef.current = nextIds;
    }, [confirmedOrders]);

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
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
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
                    />
                ))}
            </TicketColumn>

            <TicketColumn
                title="Actively Preparing"
                subtitle="Live KOTs in progress and recently completed"
                icon={<ChefHat className="h-4 w-4" />}
                count={preparingOrders.length}
                extraBadge={recentReadyOrders.length > 0 ? `${recentReadyOrders.length} ready` : undefined}
                emptyText="No tickets in the preparing lane."
                dark
            >
                {preparingOrders.map((order) => (
                    <KitchenTicketCard
                        key={order.id}
                        order={order}
                        mode="preparing"
                        now={now}
                        settings={settings}
                    />
                ))}

                {recentReadyOrders.length > 0 && (
                    <div className="space-y-3 pt-2">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#C9974A]/70">
                            Recently Ready
                        </p>
                        {recentReadyOrders.map((order) => (
                            <KitchenTicketCard
                                key={order.id}
                                order={order}
                                mode="ready"
                                now={now}
                                settings={settings}
                            />
                        ))}
                    </div>
                )}
            </TicketColumn>
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

function KitchenTicketCard({
    order,
    mode,
    now,
    settings,
}: {
    order: LiveOrder;
    mode: 'confirmed' | 'preparing' | 'ready';
    now: number;
    settings: SettingsState;
}) {
    const [busy, setBusy] = useState(false);
    const confirmedAt = getStatusTimestamp(order, 'confirmed');
    const readyAt = getStatusTimestamp(order, 'ready');
    const elapsed = formatElapsed(confirmedAt, now);
    const readyCountdown = Math.max(0, 30 - Math.floor((now - new Date(readyAt).getTime()) / 1000));
    const allPrepared = order.order_items.every((item) => ['ready', 'served'].includes(item.status ?? 'pending'));

    const handleStartPrep = async () => {
        setBusy(true);
        await startKitchenOrder(order.id);
        setBusy(false);
    };

    const handleItemToggle = async (orderItemId: string, isChecked: boolean) => {
        setBusy(true);
        await updateKitchenItemStatus(order.id, orderItemId, isChecked ? 'pending' : 'ready');
        setBusy(false);
    };

    const handleMarkReady = async () => {
        setBusy(true);
        await markKitchenOrderReady(order.id);
        setBusy(false);
    };

    const isDarkCard = mode !== 'confirmed';

    return (
        <motion.article
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className={`rounded-3xl border-l-4 p-5 shadow-lg ${isDarkCard ? 'border-[#C9974A] bg-[#241B15]' : 'border-[#4E1414] bg-white'}`}
        >
            <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                    <p className={`text-3xl font-black leading-none ${isDarkCard ? 'text-[#F6EEDF]' : 'text-[#241B15]'}`}>
                        Table {order.restaurant_tables?.table_no ?? '?'}
                    </p>
                    <p className={`mt-2 text-sm font-bold ${isDarkCard ? 'text-[#C9974A]' : 'text-[#4E1414]'}`}>
                        {order.customer_name || 'Walk-in Guest'}
                    </p>
                    <p className={`mt-1 text-xs font-semibold ${isDarkCard ? 'text-[#F6EEDF]/55' : 'text-[#241B15]/45'}`}>
                        Ticket #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                </div>

                <div className="text-right">
                    <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${isDarkCard ? 'text-[#F6EEDF]/50' : 'text-[#4E1414]/55'}`}>
                        Since Confirmed
                    </p>
                    <p className={`mt-1 text-2xl font-black ${elapsed.overdue ? 'text-red-500' : isDarkCard ? 'text-[#C9974A]' : 'text-[#4E1414]'}`}>
                        {elapsed.label}
                    </p>
                    {mode === 'ready' && (
                        <p className="mt-2 text-xs font-bold text-green-500">
                            Hiding in {readyCountdown}s
                        </p>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                {order.order_items.map((item) => {
                    const checked = ['ready', 'served'].includes(item.status ?? 'pending');
                    return (
                        <label
                            key={item.id}
                            className={`flex items-center gap-3 rounded-2xl border px-3 py-2 ${isDarkCard ? 'border-[#C9974A]/10 bg-[#2D201A]' : 'border-[#4E1414]/10 bg-[#F6EEDF]/45'}`}
                        >
                            <input
                                type="checkbox"
                                checked={checked}
                                disabled={mode !== 'preparing' || busy}
                                onChange={() => handleItemToggle(item.id, checked)}
                                className="h-4 w-4 rounded border-[#C9974A] text-[#C9974A] focus:ring-[#C9974A]"
                            />
                            <span className={`min-w-10 rounded-full px-2 py-1 text-center text-xs font-black ${isDarkCard ? 'bg-[#C9974A] text-[#241B15]' : 'bg-[#4E1414] text-[#F6EEDF]'}`}>
                                {item.qty}x
                            </span>
                            <span className={`flex-1 text-sm font-bold ${checked ? 'line-through opacity-60' : ''} ${isDarkCard ? 'text-[#F6EEDF]' : 'text-[#241B15]'}`}>
                                {item.menu_items?.name ?? 'Unknown item'}
                            </span>
                            <span className={`text-[10px] font-black uppercase tracking-wide ${checked ? 'text-green-500' : isDarkCard ? 'text-[#F6EEDF]/45' : 'text-[#241B15]/35'}`}>
                                {checked ? 'ready' : item.status ?? 'pending'}
                            </span>
                        </label>
                    );
                })}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
                {settings?.print_kot && (
                    <button
                        type="button"
                        onClick={() => printKot(order, settings)}
                        className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-black ${isDarkCard ? 'border-[#C9974A]/20 bg-[#2D201A] text-[#F6EEDF]' : 'border-[#4E1414]/15 bg-[#F6EEDF] text-[#4E1414]'}`}
                    >
                        <Printer className="h-4 w-4" />
                        Print KOT
                    </button>
                )}

                {mode === 'confirmed' && (
                    <button
                        type="button"
                        onClick={handleStartPrep}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#4E1414] px-4 py-3 text-sm font-black text-[#F6EEDF] disabled:opacity-50"
                    >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flame className="h-4 w-4 text-[#C9974A]" />}
                        Start Prep
                    </button>
                )}

                {mode === 'preparing' && (
                    <button
                        type="button"
                        onClick={handleMarkReady}
                        disabled={busy || !allPrepared}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#C9974A] px-4 py-3 text-sm font-black text-[#241B15] disabled:opacity-50"
                    >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Mark All Ready
                    </button>
                )}

                {mode === 'ready' && (
                    <div className="inline-flex items-center gap-2 rounded-xl bg-green-100 px-4 py-3 text-sm font-black text-green-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Completed and leaving screen soon
                    </div>
                )}
            </div>
        </motion.article>
    );
}
