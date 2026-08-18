"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/features/ordering/lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Plus, Trash2, X, Download, CheckCircle2, MoreVertical, Printer, Utensils, Clock, LayoutGrid, ChevronDown, Edit3 } from 'lucide-react';
import { createTable, createCustomTable, renameTable, deleteTable, fetchAdminTablesLiveData } from '@/features/ordering/actions/adminActions';
import { toast } from '@/features/ordering/lib/toast';
import JSZip from 'jszip';

type TableStatus = 'Empty' | 'Occupied' | 'Needs Bill' | 'Kitchen KOT';

const STATUS_CONFIG: Record<TableStatus, { card: string; dot: string; label: string }> = {
    Empty: { card: 'bg-white border-stone-200 hover:border-stone-400 text-stone-700', dot: 'bg-stone-400', label: 'Empty' },
    Occupied: { card: 'bg-[#F6EEDF] border-[#C9974A] text-[#4E1414] shadow-xs', dot: 'bg-[#C9974A] animate-pulse', label: 'Occupied' },
    'Needs Bill': { card: 'bg-blue-50/90 border-blue-400 text-blue-950 shadow-xs', dot: 'bg-blue-600 animate-bounce', label: 'Needs Bill' },
    'Kitchen KOT': { card: 'bg-orange-50 border-orange-300 text-orange-950', dot: 'bg-orange-500', label: 'Kitchen KOT' },
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
    latestOrderStatus?: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

async function svgToPngBlob(svgElement: HTMLElement, tableNo: number): Promise<Blob | null> {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const data = (new XMLSerializer()).serializeToString(svgElement);
        const svgBlob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        const img = new Image();
        img.onload = () => {
            canvas.width = 300;
            canvas.height = 350;
            if (ctx) {
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 22, 10, 256, 256);
                ctx.font = "bold 28px sans-serif";
                ctx.fillStyle = "#350C0C";
                ctx.textAlign = "center";
                ctx.fillText(`TABLE ${tableNo}`, canvas.width / 2, 310);
            }
            canvas.toBlob((blob) => {
                URL.revokeObjectURL(url);
                resolve(blob);
            }, 'image/png');
        };
        img.src = url;
    });
}

async function downloadQRPng(tableId: string, tableNo: number) {
    const svg: any = document.getElementById(`qr-${tableId}`);
    if (!svg) return;
    const blob = await svgToPngBlob(svg, tableNo);
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `table-${tableNo}-qr.png`;
    a.click();
    URL.revokeObjectURL(url);
}

function printQR(tableId: string, tableNo: number) {
    const svg = document.getElementById(`qr-${tableId}`);
    if (!svg) return;
    const data = (new XMLSerializer()).serializeToString(svg);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
        <html>
            <head>
                <title>Print Table ${tableNo}</title>
                <style>
                    body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; font-family: sans-serif; }
                    .container { text-align: center; border: 2px solid #000; padding: 2rem; border-radius: 1rem; }
                    h1 { margin-top: 1rem; font-size: 3rem; color: #000; }
                    svg { width: 400px; height: 400px; }
                </style>
            </head>
            <body>
                <div class="container">
                    ${data}
                    <h1>TABLE ${tableNo}</h1>
                </div>
                <script>
                    window.onload = () => { window.print(); window.close(); };
                </script>
            </body>
        </html>
    `);
    printWindow.document.close();
}

interface AdminTablesLiveProps {
    onTableClick?: (table: any) => void;
    readOnly?: boolean;
    searchQuery?: string;
}

export function AdminTablesLive({ onTableClick, readOnly = false, searchQuery = '' }: AdminTablesLiveProps) {
    const [tables, setTables] = useState<EnrichedTable[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<EnrichedTable | null>(null);
    const [showQR, setShowQR] = useState<EnrichedTable | null>(null);
    const [creating, setCreating] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [openMenuTableId, setOpenMenuTableId] = useState<string | null>(null);
    const [selectedZone, setSelectedZone] = useState<string>('Main Hall');

    // Manual Creation & Renaming Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [customTableNoInput, setCustomTableNoInput] = useState<string>('');
    const [renameTableModal, setRenameTableModal] = useState<{ id: string; currentNo: number } | null>(null);
    const [newTableNoInput, setNewTableNoInput] = useState<string>('');

    const menuRef = useRef<HTMLDivElement>(null);

    // Close table card popover menu on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpenMenuTableId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadData = useCallback(async () => {
        const res = await fetchAdminTablesLiveData();
        let tablesData: any[] = [];
        let activeOrders: any[] = [];
        let staffList: any[] = [];

        if (res.success) {
            tablesData = res.tables ?? [];
            activeOrders = res.orders ?? [];
            staffList = res.staff ?? [];
        } else {
            const [tablesRes, ordersRes, staffRes] = await Promise.all([
                supabase.from('restaurant_tables').select('*').order('table_no'),
                supabase.from('orders')
                    .select('*, order_items(*, menu_items(name))')
                    .in('status', ['pending', 'confirmed', 'preparing', 'ready', 'served']),
                supabase.from('staff_users').select('id, name'),
            ]);
            tablesData = tablesRes.data ?? [];
            activeOrders = ordersRes.data ?? [];
            staffList = staffRes.data ?? [];
        }

        const orderMap = new Map<string, any[]>();
        for (const o of activeOrders) {
            if (!orderMap.has(o.table_id)) orderMap.set(o.table_id, []);
            orderMap.get(o.table_id)!.push(o);
        }

        const enriched: EnrichedTable[] = tablesData.map((t: any) => {
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
                const isPreparing = tableOrders.some((o: any) => o.status === 'preparing' || o.status === 'confirmed');
                status = isServed ? 'Needs Bill' : (isPreparing ? 'Kitchen KOT' : 'Occupied');
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
                latestOrderStatus: latestOrder?.status
            };
        });

        setTables(enriched);
        setLoading(false);
    }, []);

    useEffect(() => {
        loadData();

        // 10-second background fallback interval (WebSockets handle instant 0ms updates)
        const pollInterval = setInterval(() => {
            loadData();
        }, 10000);

        const channelName = `admin-tables-watch-${Math.random()}`;
        const channel = supabase
            .channel(channelName)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, loadData)
            .subscribe();

        return () => {
            clearInterval(pollInterval);
            supabase.removeChannel(channel);
        };
    }, [loadData]);

    const handleAddTableAuto = async () => {
        setCreating(true);
        const res = await createTable();
        setCreating(false);
        if (res.success) {
            toast.success(`Table T-${res.table_no} created automatically!`);
            await loadData();
        } else {
            toast.error(res.error || 'Failed to create table');
        }
    };

    const handleCreateCustomTable = async () => {
        const tableNo = parseInt(customTableNoInput, 10);
        if (isNaN(tableNo) || tableNo <= 0) {
            toast.warning('Please enter a valid positive table number');
            return;
        }
        setCreating(true);
        const res = await createCustomTable(tableNo);
        setCreating(false);
        if (!res.success) {
            toast.error(res.error || 'Failed to create table');
        } else {
            toast.success(`Table T-${res.table_no} created successfully!`);
            setShowAddModal(false);
            setCustomTableNoInput('');
            await loadData();
        }
    };

    const handleRenameTable = async () => {
        if (!renameTableModal) return;
        const newNo = parseInt(newTableNoInput, 10);
        if (isNaN(newNo) || newNo <= 0) {
            toast.warning('Please enter a valid positive table number');
            return;
        }
        setCreating(true);
        const res = await renameTable(renameTableModal.id, newNo);
        setCreating(false);
        if (!res.success) {
            toast.error(res.error || 'Failed to rename table');
        } else {
            toast.success(`Table renamed to T-${newNo} successfully!`);
            setRenameTableModal(null);
            setNewTableNoInput('');
            await loadData();
        }
    };

    const handleDelete = async (id: string) => {
        await deleteTable(id);
        setConfirmDelete(null);
        await loadData();
    };

    const handleDownloadAllQRs = async () => {
        setCreating(true);
        const zip = new JSZip();
        const folder = zip.folder("Table_QRs");

        for (const t of tables) {
            const svg: any = document.getElementById(`qr-${t.id}`);
            if (svg) {
                const blob = await svgToPngBlob(svg, t.table_no);
                if (blob && folder) {
                    folder.file(`table-${t.table_no}-qr.png`, blob);
                }
            }
        }

        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `All_Table_QRs.zip`;
        a.click();
        URL.revokeObjectURL(url);
        setCreating(false);
    };

    if (loading) return (
        <div className="text-center text-[#4E1414] py-16 animate-pulse font-bold text-sm">Loading floor layout…</div>
    );

    const occupiedCount = tables.filter(t => t.status === 'Occupied' || t.status === 'Kitchen KOT').length;
    const needsBillCount = tables.filter(t => t.status === 'Needs Bill').length;
    const emptyCount = tables.length - occupiedCount - needsBillCount;

    return (
        <div className="space-y-3">
            
            {/* Inline Section Header Row (Petpooja style: compact stats + Zone selector) */}
            <div className="flex flex-wrap justify-between items-center bg-white border border-[#C9974A]/25 rounded-2xl px-4 py-2.5 shadow-2xs gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#4E1414]">
                    <LayoutGrid className="w-4 h-4 text-[#C9974A]" />
                    <span>
                        <b className="text-base font-black">{tables.length}</b> Tables &middot;{' '}
                        <span className="text-[#C9974A] font-extrabold">{occupiedCount} Occupied</span> &middot;{' '}
                        <span className="text-blue-700 font-extrabold">{needsBillCount} Needs Bill</span> &middot;{' '}
                        <span className="text-emerald-700 font-extrabold">{emptyCount} Empty</span>
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {!readOnly && (
                        <div className="flex gap-1.5">
                            <button
                                onClick={handleDownloadAllQRs}
                                disabled={creating || tables.length === 0}
                                className="flex items-center gap-1 bg-[#F6EEDF] border border-[#C9974A]/40 text-[#4E1414] px-2.5 py-1 rounded-xl text-xs font-bold hover:bg-[#e6dbcc] transition-colors disabled:opacity-50 cursor-pointer"
                            >
                                <Download className="w-3 h-3 text-[#C9974A]" /> Bulk QRs
                            </button>
                            <button
                                onClick={() => {
                                    const nextNo = (tables.length > 0 ? Math.max(...tables.map(t => t.table_no)) : 0) + 1;
                                    setCustomTableNoInput(nextNo.toString());
                                    setShowAddModal(true);
                                }}
                                disabled={creating}
                                className="flex items-center gap-1 bg-[#4E1414] text-[#F6EEDF] px-2.5 py-1 rounded-xl text-xs font-bold shadow-xs hover:bg-[#350C0C] transition-colors disabled:opacity-50 cursor-pointer"
                            >
                                <Plus className="w-3 h-3 text-[#C9974A]" /> Add / Create Table
                            </button>
                        </div>
                    )}

                    {/* Zone Selector */}
                    <div className="relative">
                        <select
                            value={selectedZone}
                            onChange={e => setSelectedZone(e.target.value)}
                            className="bg-gray-50 border border-stone-200 text-[#4E1414] text-xs font-bold rounded-xl px-2.5 py-1 outline-none cursor-pointer"
                        >
                            <option value="Main Hall">Default Zone: Main Dining</option>
                            <option value="AC Hall">AC Section</option>
                            <option value="Outdoor">Outdoor Patio</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Horizontal Color-Coded Status Legend Bar */}
            <div className="flex items-center gap-4 text-[11px] font-extrabold text-[#4E1414]/70 px-1 py-1 overflow-x-auto bg-white/40 rounded-xl border border-stone-200/50">
                <span className="text-[10px] uppercase tracking-wider text-gray-400 font-black pl-2">Status Legend:</span>
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <span className="w-2.5 h-2.5 rounded-full bg-stone-300 border border-stone-400" /> Empty
                </span>
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#C9974A] animate-pulse" /> Occupied (Dining)
                </span>
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-bounce" /> Needs Bill
                </span>
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> KOT Preparing
                </span>
            </div>

            {/* Table Floor Grid (Clean Floor Plan View) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {tables.filter(t => {
                    if (!searchQuery || !searchQuery.trim()) return true;
                    const q = searchQuery.toLowerCase().trim();
                    const tableNoMatch = `t-${t.table_no}`.includes(q) || `table ${t.table_no}`.includes(q) || t.table_no.toString() === q;
                    const nameMatch = t.customer_name?.toLowerCase().includes(q) ?? false;
                    const phoneMatch = t.customer_phone?.includes(q) ?? false;
                    const waiterMatch = t.waiter_name?.toLowerCase().includes(q) ?? false;
                    const itemMatch = t.items?.some(i => i.name.toLowerCase().includes(q)) ?? false;
                    return tableNoMatch || nameMatch || phoneMatch || waiterMatch || itemMatch;
                }).map(t => {
                    const cfg = STATUS_CONFIG[t.status];
                    const isOccupied = t.status !== 'Empty';
                    const isMenuOpen = openMenuTableId === t.id;

                    return (
                        <div
                            key={t.id}
                            className={`rounded-2xl border ${cfg.card} p-3.5 flex flex-col justify-between h-28 transition-all cursor-pointer relative group shadow-2xs hover:shadow-md ${isMenuOpen ? 'z-50 scale-[1.02] ring-2 ring-[#C9974A]/50' : 'z-10 hover:scale-[1.02]'}`}
                            onClick={() => {
                                if (onTableClick) onTableClick(t);
                                else setSelected(t);
                            }}
                        >
                            {/* Card Top Row: Table No + Status Dot + Action Menu Trigger */}
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-lg font-black tracking-tight">T-{t.table_no}</span>
                                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} title={t.status} />
                                </div>

                                <div className="flex items-center gap-1">
                                    {t.status === 'Needs Bill' && (
                                        <span title="Bill Printed">
                                            <Printer className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                                        </span>
                                    )}
                                    {t.status === 'Kitchen KOT' && (
                                        <span title="Kitchen Preparing">
                                            <Utensils className="w-3.5 h-3.5 text-orange-500" />
                                        </span>
                                    )}

                                    {!readOnly && (
                                        <button
                                            onClick={e => {
                                                e.stopPropagation();
                                                setOpenMenuTableId(openMenuTableId === t.id ? null : t.id);
                                            }}
                                            className="p-1 hover:bg-black/5 rounded-full text-stone-400 hover:text-stone-700 transition-colors"
                                            title="Table options"
                                        >
                                            <MoreVertical className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Card Center/Bottom: Compact Guest & Bill Total info */}
                            {isOccupied ? (
                                <div className="space-y-0.5 mt-auto">
                                    <p className="text-[11px] font-extrabold truncate">{t.customer_name || 'Guest'}</p>
                                    <p className="text-xs font-black text-[#C9974A]">₹{t.currentBill.toFixed(0)}</p>
                                </div>
                            ) : (
                                <p className="text-[10px] font-bold text-stone-400 mt-auto uppercase tracking-wider">Available</p>
                            )}

                            {/* Dropdown Context Menu per Table Card */}
                            {isMenuOpen && (
                                <div
                                    ref={menuRef}
                                    onClick={e => e.stopPropagation()}
                                    className="absolute top-10 right-2 w-44 bg-white rounded-2xl shadow-2xl border border-stone-200/90 p-1.5 z-50 text-xs font-bold text-[#4E1414]"
                                >
                                    {!readOnly && (
                                        <button
                                            onClick={() => {
                                                setRenameTableModal({ id: t.id, currentNo: t.table_no });
                                                setNewTableNoInput(t.table_no.toString());
                                                setOpenMenuTableId(null);
                                            }}
                                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-stone-100 text-left transition-colors"
                                        >
                                            <Edit3 className="w-3.5 h-3.5 text-[#4E1414]" /> Rename Table
                                        </button>
                                    )}
                                    <button
                                        onClick={() => { setShowQR(t); setOpenMenuTableId(null); }}
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-stone-100 text-left transition-colors"
                                    >
                                        <QrCode className="w-3.5 h-3.5 text-[#C9974A]" /> Table QR Code
                                    </button>
                                    <button
                                        onClick={() => { setSelected(t); setOpenMenuTableId(null); }}
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-stone-100 text-left transition-colors"
                                    >
                                        <Clock className="w-3.5 h-3.5 text-blue-600" /> View Details
                                    </button>
                                    {!readOnly && (
                                        <button
                                            onClick={() => { setConfirmDelete(t.id); setOpenMenuTableId(null); }}
                                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-red-50 text-red-600 text-left transition-colors border-t border-stone-100 mt-1 pt-1"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" /> Delete Table
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Detail Modal */}
            {selected && (
                <div className="fixed inset-0 bg-[#241B15]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-[#F6EEDF] border-2 border-[#C9974A] rounded-3xl w-full max-w-md p-6 relative shadow-2xl">
                        <button onClick={() => setSelected(null)} className="absolute top-4 right-4 text-[#4E1414] hover:bg-[#C9974A]/20 rounded-full p-1.5"><X className="w-5 h-5" /></button>
                        <h2 className="text-xl font-black text-[#4E1414] mb-1">Table T-{selected.table_no}</h2>
                        <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-[#4E1414] text-[#F6EEDF]">{selected.status}</span>

                        {selected.status === 'Empty' ? (
                            <p className="text-[#241B15]/60 mt-6 text-xs font-bold italic">This table has no active orders.</p>
                        ) : (
                            <div className="mt-4 space-y-3">
                                <Row label="Customer Name" value={selected.customer_name ?? '—'} />
                                <Row label="Contact Phone" value={selected.customer_phone ?? '—'} />
                                <Row label="Assigned Waiter" value={selected.waiter_name ?? 'Unassigned'} />
                                <div className="border-t border-[#C9974A]/20 pt-2">
                                    <p className="text-xs font-bold text-[#4E1414] uppercase mb-2">Order Items</p>
                                    <ul className="space-y-1 max-h-40 overflow-y-auto pr-1 taj-scrollbar-dark">
                                        {selected.items?.map((item, i) => (
                                            <li key={i} className="flex justify-between text-xs text-[#241B15]">
                                                <span>{item.name} ×{item.qty}</span>
                                                <span className="font-bold text-[#C9974A]">₹{(item.price * item.qty).toFixed(2)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="flex justify-between border-t border-[#C9974A]/20 pt-2">
                                    <span className="font-bold text-[#4E1414]">Current Bill Total</span>
                                    <span className="font-black text-[#C9974A] text-lg">₹{selected.currentBill.toFixed(2)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* QR Modal */}
            {showQR && (
                <div className="fixed inset-0 bg-[#241B15]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white border-2 border-[#C9974A] rounded-3xl w-full max-w-sm p-6 relative shadow-2xl text-center space-y-4">
                        <button onClick={() => setShowQR(null)} className="absolute top-4 right-4 text-[#4E1414] hover:bg-[#C9974A]/20 rounded-full p-1.5"><X className="w-5 h-5" /></button>
                        <h2 className="text-lg font-black text-[#4E1414]">Table T-{showQR.table_no} QR</h2>

                        <div className="flex justify-center bg-[#F6EEDF] p-4 rounded-2xl border border-[#C9974A]/30">
                            <QRCodeSVG
                                id={`qr-${showQR.id}`}
                                value={`${BASE_URL}/MenuCard?table=${showQR.id}`}
                                size={170}
                                fgColor="#4E1414"
                                bgColor="#F6EEDF"
                            />
                        </div>

                        <div className="flex flex-col gap-2 pt-2">
                            <button
                                onClick={() => downloadQRPng(showQR.id, showQR.table_no)}
                                className="w-full flex items-center justify-center gap-2 bg-[#4E1414] text-[#F6EEDF] py-2.5 rounded-xl font-bold text-xs hover:bg-[#350C0C] transition-colors cursor-pointer"
                            >
                                <Download className="w-4 h-4 text-[#C9974A]" /> Download PNG
                            </button>
                            <button
                                onClick={() => printQR(showQR.id, showQR.table_no)}
                                className="w-full flex items-center justify-center gap-2 border border-[#4E1414] text-[#4E1414] bg-white py-2.5 rounded-xl font-bold text-xs hover:bg-[#F6EEDF] transition-colors cursor-pointer"
                            >
                                Print Thermal QR
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {confirmDelete && (
                <div className="fixed inset-0 bg-[#241B15]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white border-2 border-red-300 rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center space-y-3">
                        <Trash2 className="w-8 h-8 text-red-500 mx-auto" />
                        <h2 className="text-lg font-black text-[#241B15]">Remove table?</h2>
                        <p className="text-xs text-[#241B15]/60">This action is permanent.</p>
                        <div className="flex gap-2.5 pt-2">
                            <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2 rounded-xl border border-gray-200 font-bold text-xs text-[#241B15] hover:bg-gray-50">Cancel</button>
                            <button onClick={() => handleDelete(confirmDelete)} className="flex-1 py-2 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 flex items-center justify-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Manual Add Table Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-[#241B15]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white border-2 border-[#C9974A] rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-stone-100">
                            <h3 className="font-extrabold text-[#4E1414] text-base flex items-center gap-2">
                                <Plus className="w-5 h-5 text-[#C9974A]" /> Create / Add Table
                            </h3>
                            <button onClick={() => setShowAddModal(false)} className="text-stone-400 hover:text-stone-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-[#4E1414] mb-1">Enter Table Number</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <span className="absolute left-3 top-2.5 font-bold text-xs text-stone-400">T-</span>
                                        <input
                                            type="number"
                                            min="1"
                                            value={customTableNoInput}
                                            onChange={e => setCustomTableNoInput(e.target.value)}
                                            placeholder="e.g. 15 or 101"
                                            className="w-full pl-8 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-[#4E1414] focus:bg-white outline-none focus:border-[#C9974A]"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAddTableAuto}
                                        disabled={creating}
                                        className="bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs px-3 py-2 rounded-xl transition-colors whitespace-nowrap cursor-pointer"
                                    >
                                        Auto-Next
                                    </button>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleCreateCustomTable}
                                disabled={creating || !customTableNoInput}
                                className="w-full bg-[#4E1414] hover:bg-[#350C0C] text-[#F6EEDF] font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 mt-2 cursor-pointer"
                            >
                                <CheckCircle2 className="w-4 h-4 text-[#C9974A]" /> Save New Table
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rename Table Modal */}
            {renameTableModal && (
                <div className="fixed inset-0 bg-[#241B15]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white border-2 border-[#C9974A] rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-stone-100">
                            <h3 className="font-extrabold text-[#4E1414] text-base flex items-center gap-2">
                                <Edit3 className="w-5 h-5 text-[#C9974A]" /> Rename Table T-{renameTableModal.currentNo}
                            </h3>
                            <button onClick={() => setRenameTableModal(null)} className="text-stone-400 hover:text-stone-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-[#4E1414] mb-1">New Table Number</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 font-bold text-xs text-stone-400">T-</span>
                                    <input
                                        type="number"
                                        min="1"
                                        value={newTableNoInput}
                                        onChange={e => setNewTableNoInput(e.target.value)}
                                        placeholder="Enter new table number"
                                        className="w-full pl-8 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-[#4E1414] focus:bg-white outline-none focus:border-[#C9974A]"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={() => setRenameTableModal(null)}
                                    className="flex-1 py-2.5 rounded-xl border border-stone-200 font-bold text-xs text-[#4E1414] hover:bg-stone-50 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRenameTable}
                                    disabled={creating || !newTableNoInput}
                                    className="flex-1 bg-[#4E1414] hover:bg-[#350C0C] text-[#F6EEDF] font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                    <CheckCircle2 className="w-4 h-4 text-[#C9974A]" /> Update Table
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between py-1.5 border-b border-[#C9974A]/10 text-xs">
            <span className="text-[#4E1414]/70 font-semibold">{label}</span>
            <span className="font-bold text-[#241B15]">{value}</span>
        </div>
    );
}
