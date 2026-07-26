"use client";

import { useState } from "react";
import { AdminTablesLive } from "@/app/staff/admin/components/AdminTablesLive";
import {
    LayoutGrid, ChefHat, CalendarRange, Activity, Flame,
    ShoppingBag, Plus, ArrowRight, CheckCircle2, Clock,
    Search, Package, AlertCircle
} from "lucide-react";
import { fmt, orderTotal } from "./utils";
import { advanceOrderStatus } from "@/features/ordering/actions/updateOrderStatus";
import { BillingTakeawayCreator } from "./BillingTakeawayCreator";

interface Props {
    tables: any[]; handleSelectTable: (table: any) => void; hasPerm: (perm: string) => boolean;
    menuItemsList: any[]; handleToggleItemStock: (itemId: string, currentVal: boolean) => void;
    activeOrders: any[]; takeawayOrders: any[];
    attendanceStaffId: string; setAttendanceStaffId: (id: string) => void;
    staffList: any[]; handleStaffAttendance: (action: "clock_in" | "clock_out") => void;
    attendanceLogs: any[]; guests: any[];
    openingFloat: number; expectedCash: number; dayStats: any; isRegisterOpen: boolean;
    handleSidebarAction: (actionId: string, permKey: string) => void;
    history: any[]; handleOpenSession: (float: number) => Promise<void>;
    setView: (view: any) => void; loadData: () => Promise<void>;
    visibleWidgets?: string[]; widgetOrder?: string[];
}

function CardHeader({ icon: Icon, title, subtitle, badge }: { icon: React.ElementType; title: string; subtitle?: string; badge?: React.ReactNode; }) {
    return (
        <div className="px-4 py-2.5 bg-stone-50/80 border-b border-stone-200/70 flex justify-between items-center gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
                <div className="p-1 bg-[#4E1414]/5 text-[#C9974A] rounded-md shrink-0"><Icon className="w-3.5 h-3.5" /></div>
                <div className="min-w-0">
                    <h3 className="font-extrabold text-[11px] uppercase tracking-wider text-[#4E1414] truncate">{title}</h3>
                    {subtitle && <p className="text-[9px] text-gray-400 font-normal truncate">{subtitle}</p>}
                </div>
            </div>
            {badge && <div className="shrink-0">{badge}</div>}
        </div>
    );
}

function Pill({ children, variant = "default", pulse = false }: { children: React.ReactNode; variant?: "default"|"green"|"amber"|"red"|"orange"|"blue"; pulse?: boolean; }) {
    const map = {
        default: "bg-gray-100 text-gray-600 border-gray-200",
        green:   "bg-emerald-50 text-emerald-700 border-emerald-200",
        amber:   "bg-amber-50 text-amber-700 border-amber-200",
        red:     "bg-rose-50 text-rose-700 border-rose-200",
        orange:  "bg-orange-50 text-orange-700 border-orange-200",
        blue:    "bg-sky-50 text-sky-700 border-sky-200",
    };
    return <span className={`flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border ${map[variant]} ${pulse ? "animate-pulse" : ""}`}>{children}</span>;
}

function ElapsedBadge({ minutes }: { minutes: number }) {
    const cls = minutes > 20 ? "bg-rose-100 text-rose-700 border-rose-200" : minutes > 10 ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-emerald-100 text-emerald-700 border-emerald-200";
    return <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full border ${cls}`}>{minutes}m</span>;
}

export function BentoDashboard({
    tables, handleSelectTable, hasPerm, menuItemsList, handleToggleItemStock,
    activeOrders, takeawayOrders, attendanceStaffId, setAttendanceStaffId,
    staffList, handleStaffAttendance, attendanceLogs, openingFloat, expectedCash,
    dayStats, isRegisterOpen, handleSidebarAction, history, handleOpenSession,
    setView, loadData, visibleWidgets,
}: Props) {
    const DEFAULT_WIDGETS = ["floor_map","takeaway_desk","kot_monitor","stock_availability","staff_attendance","trending_dish","cash_register"];
    const active = visibleWidgets && visibleWidgets.length > 0 ? visibleWidgets : DEFAULT_WIDGETS;
    const show = (id: string) => active.includes(id);

    const [newFloat, setNewFloat] = useState(2500);
    const [showTakeawayModal, setShowTakeawayModal] = useState(false);
    const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
    const [stockSearch, setStockSearch] = useState("");

    const activeTakeawayOrders = takeawayOrders || [];
    const takeawayRevenue = history.filter(o => o.source === "takeaway" || !o.table_id).reduce((sum, o) => sum + orderTotal(o), 0);

    const itemCounts: Record<string, { qty: number; name: string; isVeg: boolean }> = {};
    [...(activeOrders || []), ...(history || [])].forEach(order => {
        order.order_items?.forEach((i: any) => {
            const n = i.menu_items?.name; if (!n) return;
            if (!itemCounts[n]) itemCounts[n] = { qty: 0, name: n, isVeg: !!i.menu_items?.is_veg };
            itemCounts[n].qty += i.qty;
        });
    });
    const topItems = Object.values(itemCounts).sort((a, b) => b.qty - a.qty).slice(0, 3);
    const maxQty = topItems[0]?.qty || 1;

    const filteredMenu = menuItemsList.filter(i => i.name.toLowerCase().includes(stockSearch.toLowerCase()));
    const outOfStockCount = menuItemsList.filter(i => !i.is_available).length;
    const totalTables = tables.length;
    const occupiedCount = tables.filter(t => t.status !== "Empty").length;
    const needsBill = tables.filter(t => t.status === "Awaiting Settlement").length;
    const emptyCount = tables.filter(t => t.status === "Empty").length;
    const onShift = attendanceLogs.filter((l: any) => !l.clock_out).length;

    const advanceKOT = async (orderId: string, next: string) => {
        setUpdatingOrderId(orderId);
        const res = await advanceOrderStatus(orderId, next as any);
        setUpdatingOrderId(null);
        if ("error" in res) alert(res.error); else await loadData();
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {showTakeawayModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                    <div className="bg-white w-full max-w-2xl rounded-2xl p-5 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
                        <BillingTakeawayCreator menuItems={menuItemsList} takeawayOrdersCount={activeTakeawayOrders.length} onClose={() => setShowTakeawayModal(false)} loadData={loadData} handleSelectTable={handleSelectTable} />
                    </div>
                </div>
            )}

            {/* WIDGET 1 — Floor Map */}
            {show("floor_map") && (
                <div className="md:col-span-12 bg-white rounded-xl shadow-2xs border border-stone-200/80 overflow-hidden">
                    <CardHeader icon={LayoutGrid} title="Dine-In Floor Map" subtitle="Select table to open checkout panel"
                        badge={
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <Pill>{totalTables} Total</Pill>
                                {occupiedCount > 0 && <Pill variant="amber" pulse>{occupiedCount} Occupied</Pill>}
                                {needsBill > 0 && <Pill variant="red" pulse>{needsBill} Bill Pending</Pill>}
                                <Pill variant="green">{emptyCount} Empty</Pill>
                            </div>
                        }
                    />
                    <div className="p-3.5">
                        <AdminTablesLive onTableClick={t => { const ct = tables.find(x => x.id === t.id); if (ct) handleSelectTable(ct); }} readOnly={!hasPerm("manage_tables")} />
                    </div>
                </div>
            )}

            {/* WIDGET 2 — Takeaway */}
            {show("takeaway_desk") && (
                <div className="md:col-span-6 bg-white rounded-xl shadow-2xs border border-stone-200/80 overflow-hidden flex flex-col justify-between">
                    <div>
                        <CardHeader icon={ShoppingBag} title="Takeaway Counter" subtitle="Express pickups & takeaway orders"
                            badge={<Pill variant={activeTakeawayOrders.length > 0 ? "amber" : "default"} pulse={activeTakeawayOrders.length > 0}>{activeTakeawayOrders.length} Active</Pill>}
                        />
                        <div className="grid grid-cols-2 gap-2 p-3 border-b border-stone-100">
                            <div className="bg-stone-50 border border-stone-100 p-2.5 rounded-lg">
                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Active Pickups</p>
                                <p className="text-base font-black text-[#4E1414] mt-0.5">{activeTakeawayOrders.length} orders</p>
                            </div>
                            <div className="bg-stone-50 border border-stone-100 p-2.5 rounded-lg">
                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Today&apos;s Sales</p>
                                <p className="text-base font-black text-emerald-700 mt-0.5">{fmt(takeawayRevenue)}</p>
                            </div>
                        </div>
                        <div className="overflow-y-auto max-h-[140px] p-3 space-y-1.5 taj-scrollbar-dark">
                            {activeTakeawayOrders.length === 0 ? (
                                <p className="text-center text-xs text-gray-400 italic py-5">No pending takeaway orders.</p>
                            ) : activeTakeawayOrders.map((order: any) => {
                                const elapsed = Math.round((Date.now() - new Date(order.created_at).getTime()) / 60000);
                                return (
                                    <div key={order.id} className="bg-stone-50 border border-stone-100 rounded-lg p-2 flex justify-between items-center text-xs">
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-bold text-[#4E1414]">#{order.token_no || order.id.slice(0,4)}</span>
                                                <span className="text-gray-600 font-semibold">{order.customer_name}</span>
                                                <ElapsedBadge minutes={elapsed} />
                                            </div>
                                            <p className="text-[9px] text-gray-400 mt-0.5">{order.order_items.length} items &middot; {fmt(orderTotal(order))}</p>
                                        </div>
                                        <button onClick={() => handleSelectTable({ id: `takeaway_${order.id}`, table_no: 0, status: "Occupied", customer_name: order.customer_name, customer_phone: order.customer_phone, orders: [order] })} className="bg-[#4E1414] hover:bg-[#3d0f0f] text-[#F6EEDF] text-[9px] font-bold px-2 py-1 rounded-md flex items-center gap-1 cursor-pointer">
                                            Bill <ArrowRight className="w-2.5 h-2.5 text-[#C9974A]" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="p-2.5 flex gap-2 border-t border-stone-100 shrink-0">
                        <button onClick={() => setShowTakeawayModal(true)} className="flex-1 bg-[#4E1414] hover:bg-[#3d0f0f] text-[#F6EEDF] font-bold text-xs py-1.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer shadow-2xs">
                            <Plus className="w-3.5 h-3.5 text-[#C9974A]" /> + Takeaway
                        </button>
                        <button onClick={() => setView("takeaway")} className="px-3 bg-white border border-stone-200 text-[#4E1414] hover:bg-stone-50 font-bold text-xs py-1.5 rounded-lg cursor-pointer">
                            Full List &rarr;
                        </button>
                    </div>
                </div>
            )}

            {/* WIDGET 3 — KOT Monitor */}
            {show("kot_monitor") && (
                <div className="md:col-span-6 bg-white rounded-xl shadow-2xs border border-stone-200/80 overflow-hidden flex flex-col justify-between">
                    <div>
                        <CardHeader icon={ChefHat} title="Live Kitchen Tickets" subtitle="Realtime KOT Monitor"
                            badge={<Pill variant="green"><Clock className="w-2.5 h-2.5" /> Realtime KOT Sync</Pill>}
                        />
                        <div className="overflow-y-auto max-h-[200px] p-3 space-y-2 taj-scrollbar-dark">
                            {activeOrders.length === 0 ? (
                                <p className="text-center text-xs text-gray-400 italic py-8">No active kitchen tickets.</p>
                            ) : activeOrders.map((order: any) => {
                                const elapsed = Math.round((Date.now() - new Date(order.created_at).getTime()) / 60000);
                                const isUpd = updatingOrderId === order.id;
                                return (
                                    <div key={order.id} className="bg-stone-50 border border-stone-100 rounded-lg p-2.5 space-y-1.5 text-xs">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-bold text-[#4E1414]">
                                                    {order.restaurant_tables ? `Table T-${order.restaurant_tables.table_no}` : `#${order.token_no || order.id.slice(0,4)}`}
                                                </span>
                                                <span className="text-[10px] text-gray-500">{order.customer_name}</span>
                                                <ElapsedBadge minutes={elapsed} />
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${order.status === "ready" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : order.status === "preparing" ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse" : "bg-stone-100 text-stone-700 border-stone-200"}`}>
                                                {order.status}
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-gray-600 bg-white rounded-md p-1.5 border border-stone-100 space-y-0.5">
                                            {order.order_items.map((i: any, idx: number) => (
                                                <div key={idx} className="flex justify-between">
                                                    <span>{i.menu_items?.name} {i.notes && <i className="text-gray-400">({i.notes})</i>}</span>
                                                    <span className="font-bold text-[#4E1414]">&times;{i.qty}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-1 justify-end">
                                            {order.status === "pending" && <button disabled={isUpd} onClick={() => advanceKOT(order.id, "confirmed")} className="px-2 py-0.5 bg-[#C9974A] hover:bg-[#b08139] text-[#4E1414] font-bold text-[9px] rounded cursor-pointer">Accept</button>}
                                            {["pending","confirmed"].includes(order.status) && <button disabled={isUpd} onClick={() => advanceKOT(order.id, "preparing")} className="px-2 py-0.5 bg-[#4E1414] hover:bg-[#3d0f0f] text-[#F6EEDF] font-bold text-[9px] rounded flex items-center gap-1 cursor-pointer"><ChefHat className="w-2.5 h-2.5 text-[#C9974A]" /> Prep</button>}
                                            {order.status === "preparing" && <button disabled={isUpd} onClick={() => advanceKOT(order.id, "ready")} className="px-2 py-0.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[9px] rounded flex items-center gap-1 cursor-pointer"><CheckCircle2 className="w-2.5 h-2.5" /> Ready</button>}
                                            {order.status === "ready" && <button disabled={isUpd} onClick={() => advanceKOT(order.id, "served")} className="px-2 py-0.5 bg-sky-700 hover:bg-sky-800 text-white font-bold text-[9px] rounded cursor-pointer">Served</button>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* WIDGET 4 — Menu Stock */}
            {show("stock_availability") && (
                <div className="md:col-span-4 bg-white rounded-xl shadow-2xs border border-stone-200/80 overflow-hidden flex flex-col min-h-[220px]">
                    <CardHeader icon={Package} title="Instant Menu Stock" subtitle="Quick availability toggle"
                        badge={outOfStockCount > 0 ? <Pill variant="red" pulse>{outOfStockCount} Out</Pill> : <Pill variant="green">All Stocked</Pill>}
                    />
                    <div className="p-2.5 border-b border-stone-100">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                            <input type="text" placeholder="Search menu items..." value={stockSearch} onChange={e => setStockSearch(e.target.value)} className="w-full pl-7 pr-2.5 py-1 text-[11px] bg-stone-50 border border-stone-200 rounded-md focus:outline-none focus:border-[#C9974A]" />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-[145px] p-2.5 space-y-1 taj-scrollbar-dark">
                        {filteredMenu.map((item: any) => (
                            <div key={item.id} className="flex justify-between items-center text-xs py-1 border-b border-stone-50 last:border-0">
                                <span className="font-semibold truncate max-w-[130px] flex items-center gap-1.5">
                                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.is_available ? "bg-emerald-500" : "bg-rose-500"}`} />
                                    <span className="truncate">{item.name}</span>
                                    {item.stock_qty !== null && <span className="text-[8px] bg-amber-50 text-amber-800 border border-amber-200 px-1 rounded font-bold">Qty:{item.stock_qty}</span>}
                                </span>
                                <button onClick={() => handleToggleItemStock(item.id, item.is_available)} className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase transition-all border ${item.is_available ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-rose-50 hover:text-rose-700" : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-emerald-50 hover:text-emerald-700"}`}>
                                    {item.is_available ? (item.stock_qty !== null ? "Limited" : "In Stock") : "Out"}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* WIDGET 5 — Staff Attendance */}
            {show("staff_attendance") && (
                <div className="md:col-span-4 bg-white rounded-xl shadow-2xs border border-stone-200/80 overflow-hidden flex flex-col min-h-[220px]">
                    <CardHeader icon={CalendarRange} title="Staff Attendance" subtitle="Clock in / clock out register"
                        badge={<Pill variant={onShift > 0 ? "green" : "default"}>{onShift} On Shift</Pill>}
                    />
                    <div className="p-2.5 space-y-2 text-xs flex-1">
                        <div className="flex gap-1.5">
                            <select value={attendanceStaffId} onChange={e => setAttendanceStaffId(e.target.value)} className="flex-1 bg-stone-50 border border-stone-200 rounded-md px-2 py-1 text-xs text-[#4E1414] focus:outline-none truncate">
                                {staffList.map((st: any) => <option key={st.id} value={st.id}>{st.name}</option>)}
                            </select>
                            <button onClick={() => handleStaffAttendance("clock_in")} className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-2 py-1 rounded text-[9px] cursor-pointer">In</button>
                            <button onClick={() => handleStaffAttendance("clock_out")} className="bg-rose-700 hover:bg-rose-800 text-white font-bold px-2 py-1 rounded text-[9px] cursor-pointer">Out</button>
                        </div>
                        <div className="space-y-1 max-h-[85px] overflow-y-auto pr-0.5">
                            {attendanceLogs.slice(0,3).map((log: any) => (
                                <div key={log.id} className="flex justify-between text-[9px] bg-stone-50 p-1 rounded border border-stone-100">
                                    <span className="font-bold truncate max-w-[60px]">{log.staff_name}</span>
                                    <span className="text-gray-500">In: {new Date(log.clock_in).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
                                    <span className={log.clock_out ? "text-gray-400" : "text-emerald-700 font-bold"}>{log.clock_out ? `Out: ${new Date(log.clock_out).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}` : "Active"}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* WIDGET 6 — Trending Dishes */}
            {show("trending_dish") && (
                <div className="md:col-span-4 bg-white rounded-xl shadow-2xs border border-stone-200/80 overflow-hidden flex flex-col min-h-[220px] relative">
                    <CardHeader icon={Flame} title="Popular Trending" subtitle="Shift bestseller insights"
                        badge={topItems.length > 0 ? <Pill variant="orange">Hot Item</Pill> : <Pill>No Sales</Pill>}
                    />
                    <div className="p-3 flex-1 flex flex-col justify-between">
                        {topItems.length === 0 ? (
                            <p className="text-xs text-gray-400 italic text-center py-6">No portion sales recorded yet this shift.</p>
                        ) : (
                            <div className="space-y-2">
                                {topItems.map((item, idx) => {
                                    const pct = Math.round((item.qty / maxQty) * 100);
                                    return (
                                        <div key={item.name} className="space-y-0.5">
                                            <div className="flex justify-between text-[11px]">
                                                <span className="font-bold text-[#4E1414] truncate flex items-center gap-1">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? "bg-emerald-500" : "bg-rose-500"}`} />
                                                    {item.name}
                                                </span>
                                                <span className="font-bold text-[#C9974A] text-[10px]">{item.qty} sold</span>
                                            </div>
                                            <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-[#C9974A] rounded-full" style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        <div className="bg-stone-50 border border-stone-100 rounded-md p-1.5 text-[9px] text-gray-500 font-medium">
                            💡 Highest grossing dish appears automatically on settle.
                        </div>
                    </div>
                </div>
            )}

            {/* WIDGET 7 — Cash Register */}
            {show("cash_register") && (
                <div className="md:col-span-12 bg-white rounded-xl shadow-2xs border border-stone-200/80 overflow-hidden">
                    <CardHeader icon={Activity} title="Cash Drawer Register Session" subtitle="Float balancing & drawer session"
                        badge={isRegisterOpen ? <Pill variant="green">Register Open</Pill> : <Pill variant="red">Register Closed</Pill>}
                    />
                    <div className="p-3.5">
                        {isRegisterOpen ? (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                <div className="bg-stone-50 border border-stone-100 p-2.5 rounded-lg">
                                    <span className="text-[9px] font-bold text-gray-400 uppercase">Opening Float</span>
                                    <p className="text-sm font-black text-[#4E1414] mt-0.5">{fmt(openingFloat)}</p>
                                </div>
                                <div className="bg-emerald-50/60 border border-emerald-100 p-2.5 rounded-lg">
                                    <span className="text-[9px] font-bold text-emerald-600 uppercase">Cash Sales</span>
                                    <p className="text-sm font-black text-emerald-700 mt-0.5">{fmt(dayStats.cashSales)}</p>
                                </div>
                                <div className="bg-sky-50/60 border border-sky-100 p-2.5 rounded-lg">
                                    <span className="text-[9px] font-bold text-sky-600 uppercase">Expected Drawer</span>
                                    <p className="text-sm font-black text-sky-700 mt-0.5">{fmt(expectedCash)}</p>
                                </div>
                                <button onClick={() => handleSidebarAction("Drawer Session", "view_billing")} className="bg-[#4E1414] hover:bg-[#3b0e0e] text-[#F6EEDF] font-bold px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5">
                                    <Activity className="w-3.5 h-3.5 text-[#C9974A]" /> Drawer Balancing
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 flex-wrap text-xs">
                                <label className="font-bold text-gray-600">Opening Float (₹):</label>
                                <input type="number" value={newFloat} onChange={e => setNewFloat(Number(e.target.value))} min={0} className="w-28 border border-stone-200 rounded-md px-2.5 py-1 font-bold focus:outline-none focus:border-[#C9974A]" />
                                <button onClick={() => handleOpenSession(newFloat)} className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-1.5 rounded-md text-xs cursor-pointer">
                                    ✓ Open Session
                                </button>
                                <span className="text-[10px] text-gray-400 italic">Open register to track float balancing.</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
