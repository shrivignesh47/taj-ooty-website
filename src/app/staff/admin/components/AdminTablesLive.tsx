/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/features/ordering/lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Plus, Trash2, UserCheck, X, Download, CheckCircle2 } from 'lucide-react';
import { createTable, deleteTable } from '@/features/ordering/actions/adminActions';

// Status derived at runtime from live orders
type TableStatus = 'Empty' | 'Occupied' | 'Needs Bill';

const STATUS_COLORS: Record<TableStatus, { card: string; badge: string; dot: string }> = {
    Empty: { card: 'border-green-200', badge: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
    Occupied: { card: 'border-[#C9974A]/60', badge: 'bg-[#C9974A]/20 text-[#4E1414]', dot: 'bg-[#C9974A]' },
    'Needs Bill': { card: 'border-blue-200', badge: 'bg-blue-100 text-blue-800', dot: 'bg-blue-500' },
};

interface EnrichedTable {
    id: string;
    table_no: number;
    assigned_waiter_id: string | null;
    waiter_name?: string;
    status: TableStatus;
    currentBill: number;
    customer_name?: string;
    customer_phone?: string;
    items?: { name: string; qty: number; price: number }[];
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

function downloadQR(tableId: string, tableNo: number) {
    const svg = document.getElementById(`qr-${tableId}`);
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `table-T${tableNo}-qr.svg`;
    a.click();
    URL.revokeObjectURL(url);
}

export function AdminTablesLive() {
    const [tables, setTables] = useState<EnrichedTable[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<EnrichedTable | null>(null);
    const [showQR, setShowQR] = useState<EnrichedTable | null>(null);
    const [creating, setCreating] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        const [tablesRes, ordersRes, staffRes] = await Promise.all([
            supabase.from('restaurant_tables').select('*').order('table_no'),
            supabase.from('orders')
                .select('*, order_items(*, menu_items(name))')
                .in('status', ['pending', 'confirmed', 'preparing', 'ready', 'served']),
            supabase.from('staff_users').select('id, name'),
        ]);

        const staffList = staffRes.data ?? [];
        const activeOrders: any[] = ordersRes.data ?? [];
        const orderMap = new Map<string, any[]>();
        for (const o of activeOrders) {
            if (!orderMap.has(o.table_id)) orderMap.set(o.table_id, []);
            orderMap.get(o.table_id)!.push(o);
        }

        const enriched: EnrichedTable[] = (tablesRes.data ?? []).map((t: any) => {
            const tableOrders = orderMap.get(t.id) ?? [];
            const latestOrder = tableOrders[0];
            const waiter = staffList.find((s: any) => s.id === t.assigned_waiter_id);

            let status: TableStatus = 'Empty';
            let bill = 0;
            let customer_name: string | undefined;
            let customer_phone: string | undefined;
            const items: { name: string; qty: number; price: number }[] = [];

            if (latestOrder) {
                const isServed = tableOrders.every((o: any) => o.status === 'served');
                status = isServed ? 'Needs Bill' : 'Occupied';
                customer_name = latestOrder.customer_name;
                customer_phone = latestOrder.customer_phone;

                for (const o of tableOrders) {
                    for (const i of (o.order_items ?? [])) {
                        bill += i.price_at_order * i.qty;
                        items.push({ name: i.menu_items?.name ?? '?', qty: i.qty, price: i.price_at_order });
                    }
                }
            }

            return {
                id: t.id,
                table_no: t.table_no,
                assigned_waiter_id: t.assigned_waiter_id,
                waiter_name: waiter?.name,
                status,
                currentBill: bill,
                customer_name,
                customer_phone,
                items,
            };
        });

        setTables(enriched);
        setLoading(false);
    }, []);

    useEffect(() => {
        // eslint-disable-next-line
        loadData();
        const channel = supabase
            .channel('admin-tables-watch')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, loadData)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [loadData]);

    const handleAddTable = async () => {
        setCreating(true);
        await createTable();
        await loadData();
        setCreating(false);
    };

    const handleDelete = async (id: string) => {
        await deleteTable(id);
        setConfirmDelete(null);
        await loadData();
    };

    if (loading) return (
        <div className="text-center text-[#4E1414] py-20 animate-pulse font-semibold">Loading tables…</div>
    );

    const occupied = tables.filter(t => t.status === 'Occupied').length;
    const needsBill = tables.filter(t => t.status === 'Needs Bill').length;

    return (
        <div className="space-y-6">
            {/* Summary bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Tables', value: tables.length, color: 'text-[#4E1414]' },
                    { label: 'Occupied', value: occupied, color: 'text-[#C9974A]' },
                    { label: 'Needs Bill', value: needsBill, color: 'text-blue-700' },
                    { label: 'Empty', value: tables.length - occupied - needsBill, color: 'text-green-700' },
                ].map(s => (
                    <div key={s.label} className="bg-white rounded-2xl border border-[#C9974A]/20 p-5 flex flex-col items-center">
                        <span className={`text-4xl font-black ${s.color}`}>{s.value}</span>
                        <span className="text-xs font-bold text-[#241B15]/50 uppercase tracking-wider mt-1">{s.label}</span>
                    </div>
                ))}
            </div>

            {/* Add table */}
            <div className="flex justify-end">
                <button
                    onClick={handleAddTable}
                    disabled={creating}
                    className="flex items-center gap-2 bg-[#4E1414] text-[#F6EEDF] px-5 py-2.5 rounded-xl font-bold shadow hover:bg-[#350C0C] transition-colors disabled:opacity-50"
                >
                    <Plus className="w-4 h-4 text-[#C9974A]" />
                    {creating ? 'Adding…' : 'Add New Table'}
                </button>
            </div>

            {/* Table grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {tables.map(t => {
                    const sc = STATUS_COLORS[t.status];
                    return (
                        <div
                            key={t.id}
                            className={`bg-white rounded-2xl border-2 ${sc.card} p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer`}
                            onClick={() => setSelected(t)}
                        >
                            <div className="flex justify-between items-center">
                                <span className="text-2xl font-black text-[#4E1414]">T-{t.table_no}</span>
                                <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${sc.badge}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                    {t.status}
                                </span>
                            </div>

                            <div className="text-xs text-[#241B15]/60 flex items-center gap-1.5">
                                <UserCheck className="w-3.5 h-3.5 text-[#C9974A]" />
                                {t.waiter_name ?? <span className="italic">No waiter assigned</span>}
                            </div>

                            {t.status !== 'Empty' && (
                                <div className="border-t border-[#F6EEDF] pt-3 space-y-1">
                                    <p className="text-xs font-bold text-[#241B15]">{t.customer_name}</p>
                                    <p className="text-xs text-[#241B15]/50">{t.customer_phone}</p>
                                    <p className="font-black text-[#C9974A] text-base">₹{t.currentBill.toFixed(2)}</p>
                                </div>
                            )}

                            <div className="flex gap-2 mt-auto pt-2 border-t border-[#F6EEDF]" onClick={e => e.stopPropagation()}>
                                <button
                                    onClick={() => setShowQR(t)}
                                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2 px-3 bg-[#F6EEDF] text-[#4E1414] rounded-lg hover:bg-[#e4d7be] transition-colors"
                                >
                                    <QrCode className="w-3.5 h-3.5" /> QR Code
                                </button>
                                <button
                                    onClick={() => setConfirmDelete(t.id)}
                                    className="flex items-center justify-center p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors outline outline-1 outline-red-200"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Detail modal (customer info) */}
            {selected && (
                <div className="fixed inset-0 bg-[#241B15]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#F6EEDF] border-2 border-[#C9974A] rounded-3xl w-full max-w-md p-8 relative shadow-2xl">
                        <button onClick={() => setSelected(null)} className="absolute top-5 right-5 text-[#4E1414] hover:bg-[#C9974A]/20 rounded-full p-1.5"><X className="w-5 h-5" /></button>
                        <h2 className="text-2xl font-black text-[#4E1414] mb-1">Table T-{selected.table_no}</h2>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[selected.status].badge}`}>{selected.status}</span>

                        {selected.status === 'Empty' ? (
                            <p className="text-[#241B15]/60 mt-6 text-sm">This table has no active orders.</p>
                        ) : (
                            <div className="mt-5 space-y-3">
                                <Row label="Customer" value={selected.customer_name ?? '—'} />
                                <Row label="Phone" value={selected.customer_phone ?? '—'} />
                                <Row label="Waiter" value={selected.waiter_name ?? 'Unassigned'} />
                                <div className="border-t border-[#C9974A]/20 pt-3">
                                    <p className="text-xs font-bold text-[#4E1414] uppercase mb-2">Order Items</p>
                                    <ul className="space-y-1">
                                        {selected.items?.map((item, i) => (
                                            <li key={i} className="flex justify-between text-sm text-[#241B15]">
                                                <span>{item.name} ×{item.qty}</span>
                                                <span className="font-bold text-[#C9974A]">₹{(item.price * item.qty).toFixed(2)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="flex justify-between border-t border-[#C9974A]/20 pt-3">
                                    <span className="font-bold text-[#4E1414]">Bill Total</span>
                                    <span className="font-black text-[#C9974A] text-xl">₹{selected.currentBill.toFixed(2)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* QR Modal */}
            {showQR && (
                <div className="fixed inset-0 bg-[#241B15]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white border-2 border-[#C9974A] rounded-3xl w-full max-w-sm p-8 relative shadow-2xl text-center">
                        <button onClick={() => setShowQR(null)} className="absolute top-5 right-5 text-[#4E1414] hover:bg-[#C9974A]/20 rounded-full p-1.5"><X className="w-5 h-5" /></button>
                        <h2 className="text-xl font-black text-[#4E1414] mb-1">Table T-{showQR.table_no}</h2>
                        <p className="text-xs text-[#241B15]/50 mb-5">Scan to open the ordering menu</p>

                        <div className="flex justify-center bg-[#F6EEDF] p-5 rounded-2xl border border-[#C9974A]/30 mb-5">
                            <QRCodeSVG
                                id={`qr-${showQR.id}`}
                                value={`${BASE_URL}/MenuCard?table=${showQR.id}`}
                                size={180}
                                fgColor="#4E1414"
                                bgColor="#F6EEDF"
                            />
                        </div>

                        <p className="text-[10px] text-[#241B15]/40 mb-5 font-mono break-all">
                            {BASE_URL}/MenuCard?table={showQR.id}
                        </p>

                        <button
                            onClick={() => downloadQR(showQR.id, showQR.table_no)}
                            className="w-full flex items-center justify-center gap-2 bg-[#4E1414] text-[#F6EEDF] py-3.5 rounded-xl font-bold hover:bg-[#350C0C] transition-colors"
                        >
                            <Download className="w-4 h-4 text-[#C9974A]" /> Download QR (SVG)
                        </button>
                    </div>
                </div>
            )}

            {/* Delete confirm */}
            {confirmDelete && (
                <div className="fixed inset-0 bg-[#241B15]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white border-2 border-red-300 rounded-2xl w-full max-w-sm p-8 shadow-2xl text-center">
                        <Trash2 className="w-10 h-10 text-red-500 mx-auto mb-3" />
                        <h2 className="text-xl font-black text-[#241B15] mb-2">Remove this table?</h2>
                        <p className="text-sm text-[#241B15]/60 mb-6">This is permanent. Any orders linked to it will remain, but the table entry will be deleted.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDelete(null)} className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-bold text-[#241B15] hover:bg-gray-50">Cancel</button>
                            <button onClick={() => handleDelete(confirmDelete)} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 flex items-center justify-center gap-2">
                                <CheckCircle2 className="w-4 h-4" /> Yes, Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between py-2 border-b border-[#C9974A]/10">
            <span className="text-sm text-[#4E1414]/70 font-medium">{label}</span>
            <span className="font-bold text-[#241B15]">{value}</span>
        </div>
    );
}
