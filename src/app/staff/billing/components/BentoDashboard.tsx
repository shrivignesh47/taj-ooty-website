"use client";

import { useState } from 'react';
import { AdminTablesLive } from '@/app/staff/admin/components/AdminTablesLive';
import {
    LayoutGrid, BookOpen, ChefHat, CalendarRange, User, Activity, Flame,
    ShoppingBag, Plus, ArrowRight, CheckCircle2, Clock
} from 'lucide-react';
import { fmt, orderTotal } from './utils';
import { advanceOrderStatus } from '@/features/ordering/actions/updateOrderStatus';
import { BillingTakeawayCreator } from './BillingTakeawayCreator';

interface Props {
    tables: any[];
    handleSelectTable: (table: any) => void;
    hasPerm: (perm: string) => boolean;
    menuItemsList: any[];
    handleToggleItemStock: (itemId: string, currentVal: boolean) => void;
    activeOrders: any[];
    takeawayOrders: any[];
    attendanceStaffId: string;
    setAttendanceStaffId: (id: string) => void;
    staffList: any[];
    handleStaffAttendance: (action: 'clock_in' | 'clock_out') => void;
    attendanceLogs: any[];
    guests: any[];
    openingFloat: number;
    expectedCash: number;
    dayStats: any;
    isRegisterOpen: boolean;
    handleSidebarAction: (actionId: string, permKey: string) => void;
    history: any[];
    handleOpenSession: (float: number) => Promise<void>;
    setView: (view: any) => void;
    loadData: () => Promise<void>;
    visibleWidgets?: string[];
    widgetOrder?: string[];
}

export function BentoDashboard({
    tables,
    handleSelectTable,
    hasPerm,
    menuItemsList,
    handleToggleItemStock,
    activeOrders,
    takeawayOrders,
    attendanceStaffId,
    setAttendanceStaffId,
    staffList,
    handleStaffAttendance,
    attendanceLogs,
    guests,
    openingFloat,
    expectedCash,
    dayStats,
    isRegisterOpen,
    handleSidebarAction,
    history,
    handleOpenSession,
    setView,
    loadData,
    visibleWidgets,
    widgetOrder
}: Props) {
    // Default: every widget visible if no preference saved yet
    const DEFAULT_WIDGETS = [
        'floor_map', 'takeaway_desk', 'kot_monitor', 'stock_availability',
        'staff_attendance', 'trending_dish', 'cash_register'
    ];
    const activeWidgets = visibleWidgets && visibleWidgets.length > 0 ? visibleWidgets : DEFAULT_WIDGETS;
    const isWidgetVisible = (id: string) => activeWidgets.includes(id);
    const [newFloat, setNewFloat] = useState(2500);
    const [showTakeawayModal, setShowTakeawayModal] = useState(false);
    const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

    // Calculate trending item dynamically from shift history
    const itemCounts: Record<string, { qty: number; name: string; isVeg: boolean }> = {};
    const aggregateOrders = [...(activeOrders || []), ...(history || [])];
    aggregateOrders.forEach(order => {
        order.order_items?.forEach((i: any) => {
            const itemName = i.menu_items?.name;
            if (itemName) {
                if (!itemCounts[itemName]) {
                    itemCounts[itemName] = {
                        qty: 0,
                        name: itemName,
                        isVeg: !!i.menu_items?.is_veg
                    };
                }
                itemCounts[itemName].qty += i.qty;
            }
        });
    });

    const trendingItem = Object.values(itemCounts).sort((a, b) => b.qty - a.qty)[0] || null;

    // Active Takeaway summary metrics
    const activeTakeawayOrders = takeawayOrders || [];
    const takeawayRevenue = history
        .filter(o => o.source === 'takeaway' || !o.table_id)
        .reduce((sum, o) => sum + orderTotal(o), 0);

    // Handle KOT prep status advance
    const handleAdvanceKOT = async (orderId: string, nextStatus: string) => {
        setUpdatingOrderId(orderId);
        const res = await advanceOrderStatus(orderId, nextStatus as any);
        setUpdatingOrderId(null);
        if ('error' in res) {
            alert(res.error);
        } else {
            await loadData();
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

            {/* Quick Takeaway Creator Modal Overlay */}
            {showTakeawayModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                    <div className="bg-white w-full max-w-2xl rounded-3xl p-6 shadow-2xl border border-[#C9974A]/40 max-h-[90vh] overflow-y-auto">
                        <BillingTakeawayCreator
                            menuItems={menuItemsList}
                            takeawayOrdersCount={activeTakeawayOrders.length}
                            onClose={() => setShowTakeawayModal(false)}
                            loadData={loadData}
                            handleSelectTable={handleSelectTable}
                        />
                    </div>
                </div>
            )}

            {/* ── BENTO 1: Table Floor Grid Map ── */}
            {isWidgetVisible('floor_map') && (
                <div className="bg-white border border-[#C9974A]/30 p-5 rounded-3xl shadow-sm md:col-span-12 space-y-4">
                    <div className="flex flex-wrap justify-between items-center pb-2 border-b border-[#C9974A]/10 gap-3">
                        <h3 className="font-bold text-sm uppercase tracking-wider text-[#4E1414] flex items-center gap-1.5">
                            <LayoutGrid className="w-4 h-4 text-[#C9974A]" /> Dine-In Table Floor Map & Live Billing
                        </h3>
                        <span className="text-[10px] font-bold text-gray-400">Select any occupied table to open checkout panel</span>
                    </div>
                    <AdminTablesLive
                        onTableClick={(t) => {
                            const cashierTable = tables.find(x => x.id === t.id);
                            if (cashierTable) {
                                handleSelectTable(cashierTable);
                            }
                        }}
                        readOnly={!hasPerm('manage_tables')}
                    />
                </div>
            )}
            {/* ── BENTO 2: Takeaway Counter Overview (User Requirement #1) ── */}
            {/* ── BENTO 2: Takeaway Counter Overview (User Requirement #1) ── */}
            {isWidgetVisible('takeaway_desk') && (
                <div className="bg-white border border-[#C9974A]/30 p-5 rounded-3xl shadow-sm md:col-span-6 space-y-3 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center pb-2 border-b border-[#C9974A]/10">
                            <h3 className="font-bold text-xs uppercase tracking-wider text-[#4E1414] flex items-center gap-1.5">
                                <ShoppingBag className="w-4 h-4 text-[#C9974A]" /> Takeaway & Counter Express Desk
                            </h3>
                            <span className="bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[9px] px-2 py-0.5 rounded-full">
                                {activeTakeawayOrders.length} Active Pickups
                            </span>
                        </div>

                        {/* Metric Quick Stats */}
                        <div className="grid grid-cols-2 gap-3 my-3">
                            <div className="bg-[#F6EEDF]/40 border border-[#C9974A]/20 p-2.5 rounded-2xl">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Active Takeaways</span>
                                <p className="text-base font-black text-[#4E1414] mt-0.5">{activeTakeawayOrders.length} orders</p>
                            </div>
                            <div className="bg-[#F6EEDF]/40 border border-[#C9974A]/20 p-2.5 rounded-2xl">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Takeaway Sales</span>
                                <p className="text-base font-black text-green-700 mt-0.5">{fmt(takeawayRevenue)}</p>
                            </div>
                        </div>

                        {/* Active Takeaway Orders Mini Queue */}
                        <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1 taj-scrollbar-dark">
                            {activeTakeawayOrders.map(order => {
                                const totalAmt = orderTotal(order);
                                return (
                                    <div key={order.id} className="bg-gray-50 border border-gray-100 rounded-xl p-2.5 flex justify-between items-center text-xs">
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-extrabold text-[#4E1414]">#{order.token_no || order.id.slice(0, 4)}</span>
                                                <span className="font-semibold text-gray-600">· {order.customer_name}</span>
                                            </div>
                                            <p className="text-[9px] text-gray-400 mt-0.5">{order.order_items.length} items · {fmt(totalAmt)}</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const dummyTable = {
                                                    id: `takeaway_${order.id}`,
                                                    table_no: 0,
                                                    status: 'Occupied',
                                                    customer_name: order.customer_name,
                                                    customer_phone: order.customer_phone,
                                                    orders: [order]
                                                };
                                                handleSelectTable(dummyTable);
                                            }}
                                            className="bg-[#4E1414] hover:bg-[#3d0f0f] text-[#F6EEDF] text-[9px] font-extrabold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                        >
                                            Checkout <ArrowRight className="w-3 h-3 text-[#C9974A]" />
                                        </button>
                                    </div>
                                );
                            })}
                            {activeTakeawayOrders.length === 0 && (
                                <p className="text-center text-xs text-gray-400 italic py-6">No pending takeaway orders.</p>
                            )}
                        </div>
                    </div>

                    {/* Counter Quick Action Footer */}
                    <div className="flex gap-2 pt-2 border-t border-[#C9974A]/10">
                        <button
                            onClick={() => setShowTakeawayModal(true)}
                            className="flex-1 bg-[#4E1414] hover:bg-[#3d0f0f] text-[#F6EEDF] font-bold text-xs py-2 rounded-xl transition-all flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                        >
                            <Plus className="w-4 h-4 text-[#C9974A]" /> + New Takeaway Order
                        </button>
                        <button
                            onClick={() => setView('takeaway')}
                            className="px-3 bg-white border border-[#C9974A]/40 text-[#4E1414] hover:bg-[#F6EEDF]/40 font-bold text-xs py-2 rounded-xl transition-all cursor-pointer"
                        >
                            Full List →
                        </button>
                    </div>
                </div>
            )}


            {/* ── BENTO 3: Live Kitchen Ticket Queue (KOT) (User Requirement #3) ── */}
            {isWidgetVisible('kot_monitor') && (
                <div className="bg-white border border-[#C9974A]/30 p-5 rounded-3xl shadow-sm md:col-span-6 space-y-3 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center pb-2 border-b border-[#C9974A]/10">
                            <h3 className="font-bold text-xs uppercase tracking-wider text-[#4E1414] flex items-center gap-1.5">
                                <ChefHat className="w-4 h-4 text-[#C9974A]" /> Live Kitchen Tickets (KOT Monitor)
                            </h3>
                            <span className="bg-green-100 text-green-800 border border-green-300 font-extrabold text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" /> Realtime KOT Sync
                            </span>
                        </div>

                        <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 taj-scrollbar-dark my-2">
                            {activeOrders.map(order => {
                                const elapsed = Math.round((new Date().getTime() - new Date(order.created_at).getTime()) / 60000);
                                const isUpdating = updatingOrderId === order.id;

                                return (
                                    <div key={order.id} className="bg-gray-50 border border-gray-100 rounded-2xl p-3 space-y-2 text-xs">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-extrabold text-[#4E1414] text-xs">
                                                        {order.restaurant_tables ? `Table T-${order.restaurant_tables.table_no}` : `Takeaway #${order.token_no || order.id.slice(0, 4)}`}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400">· {order.customer_name}</span>
                                                </div>
                                                <p className="text-[9px] text-gray-400 mt-0.5">{order.order_items.length} items · {elapsed}m ago</p>
                                            </div>

                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border
                                            ${order.status === 'ready' ? 'bg-green-100 text-green-800 border-green-300' :
                                                    order.status === 'preparing' ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse' :
                                                        order.status === 'served' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                                            'bg-gray-100 text-gray-700 border-gray-300'}`}>
                                                {order.status}
                                            </span>
                                        </div>

                                        {/* Item detail snippets */}
                                        <div className="text-[10px] text-gray-600 bg-white rounded-xl p-2 border border-gray-100 space-y-1">
                                            {order.order_items.map((i: any, idx: number) => (
                                                <div key={idx} className="flex justify-between items-center">
                                                    <span>{i.menu_items?.name} {i.notes ? <i className="text-gray-400 font-normal">({i.notes})</i> : ''}</span>
                                                    <span className="font-bold text-[#4E1414]">×{i.qty}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Action advance controls right from Cashier */}
                                        <div className="flex gap-1.5 justify-end pt-1">
                                            {order.status === 'pending' && (
                                                <button
                                                    disabled={isUpdating}
                                                    onClick={() => handleAdvanceKOT(order.id, 'confirmed')}
                                                    className="px-2.5 py-1 bg-[#C9974A] hover:bg-[#b08139] text-[#4E1414] font-extrabold text-[9px] rounded-lg transition-colors cursor-pointer"
                                                >
                                                    Accept Order
                                                </button>
                                            )}
                                            {['pending', 'confirmed'].includes(order.status) && (
                                                <button
                                                    disabled={isUpdating}
                                                    onClick={() => handleAdvanceKOT(order.id, 'preparing')}
                                                    className="px-2.5 py-1 bg-[#4E1414] hover:bg-[#3d0f0f] text-[#F6EEDF] font-extrabold text-[9px] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                                >
                                                    <ChefHat className="w-3 h-3 text-[#C9974A]" /> Start Prep
                                                </button>
                                            )}
                                            {order.status === 'preparing' && (
                                                <button
                                                    disabled={isUpdating}
                                                    onClick={() => handleAdvanceKOT(order.id, 'ready')}
                                                    className="px-2.5 py-1 bg-green-700 hover:bg-green-800 text-white font-extrabold text-[9px] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                                >
                                                    <CheckCircle2 className="w-3 h-3" /> Mark Ready
                                                </button>
                                            )}
                                            {order.status === 'ready' && (
                                                <button
                                                    disabled={isUpdating}
                                                    onClick={() => handleAdvanceKOT(order.id, 'served')}
                                                    className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-[9px] rounded-lg transition-colors cursor-pointer"
                                                >
                                                    Mark Served
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {activeOrders.length === 0 && (
                                <p className="text-center text-xs text-gray-400 italic py-10">No active kitchen tickets.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── BENTO 4: Stock Inventory ── */}

            {/* ── BENTO 4: Stock Inventory ── */}
            {isWidgetVisible('stock_availability') && (
                <div className="bg-white border border-[#C9974A]/30 p-5 rounded-3xl shadow-sm md:col-span-4 space-y-3 flex flex-col justify-between min-h-[220px]">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-[#C9974A] flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-[#C9974A]" /> Instant Menu Stock Availability
                    </h3>
                    <div className="space-y-2 max-h-[145px] overflow-y-auto pr-1">
                        {menuItemsList.map(item => (
                            <div key={item.id} className="flex justify-between items-center text-xs py-1 border-b border-[#C9974A]/10 last:border-b-0">
                                <span className="font-semibold truncate max-w-[130px] flex items-center gap-1.5">
                                    {item.name}
                                    {item.stock_qty !== null && (
                                        <span className="text-[9px] bg-amber-100 text-amber-850 border border-amber-200 px-1.5 py-0.5 rounded font-black">
                                            Qty: {item.stock_qty}
                                        </span>
                                    )}
                                </span>
                                <button
                                    onClick={() => handleToggleItemStock(item.id, item.is_available)}
                                    className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase transition-all cursor-pointer
                                    ${item.is_available ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}
                                >
                                    {item.is_available ? (item.stock_qty !== null ? 'Limited' : 'In Stock') : 'No Stock'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}



            {/* ── BENTO 5: Staff Attendance Check-in ── */}
            {isWidgetVisible('staff_attendance') && (
                <div className="bg-white border border-[#C9974A]/30 p-5 rounded-3xl shadow-sm md:col-span-4 space-y-3 flex flex-col justify-between min-h-[220px]">
                    <div className="space-y-3">
                        <h3 className="font-bold text-xs uppercase tracking-wider text-[#C9974A] flex items-center gap-1.5">
                            <CalendarRange className="w-4 h-4 text-[#C9974A]" /> Staff Attendance Register
                        </h3>
                        <div className="space-y-3 text-xs">
                            <div className="flex gap-2">
                                <select
                                    value={attendanceStaffId}
                                    onChange={e => setAttendanceStaffId(e.target.value)}
                                    className="flex-1 bg-[#F6EEDF]/40 border border-[#C9974A]/40 rounded-xl px-2 py-1.5 text-xs text-[#4E1414] focus:outline-none max-w-[130px] sm:max-w-none"
                                >
                                    {staffList.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.is_active ? 'Active' : 'Offline'})</option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => handleStaffAttendance('clock_in')}
                                    className="bg-green-700 hover:bg-green-800 text-white font-bold px-2.5 py-1.5 rounded-lg text-[9px] cursor-pointer"
                                >
                                    In
                                </button>
                                <button
                                    onClick={() => handleStaffAttendance('clock_out')}
                                    className="bg-red-700 hover:bg-red-800 text-white font-bold px-2.5 py-1.5 rounded-lg text-[9px] cursor-pointer"
                                >
                                    Out
                                </button>
                            </div>

                            {/* Attendance logs */}
                            <div className="space-y-1 max-h-[85px] overflow-y-auto pr-1">
                                {attendanceLogs.slice(0, 3).map(log => (
                                    <div key={log.id} className="flex justify-between text-[9px] bg-gray-50 p-1 rounded border">
                                        <span className="font-semibold truncate max-w-[60px]">{log.staff_name}</span>
                                        <span>In: {new Date(log.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        <span className="text-gray-400">
                                            {log.clock_out ? `Out: ${new Date(log.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Active'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── BENTO 6: Trending Dish Insights ── */}
            {/* ── BENTO 6: Trending Dish Insights ── */}
            {isWidgetVisible('trending_dish') && (
                <div className="bg-white border border-[#C9974A]/30 p-5 rounded-3xl shadow-sm md:col-span-4 space-y-3 flex flex-col justify-between min-h-[220px] relative overflow-hidden group">
                    <div className="absolute right-0 bottom-0 opacity-5 transform translate-x-2 translate-y-2 pointer-events-none group-hover:scale-110 duration-500">
                        <Flame className="w-36 h-36" />
                    </div>

                    <div className="space-y-3">
                        <h3 className="font-bold text-xs uppercase tracking-wider text-[#C9974A] flex items-center gap-1.5">
                            <Flame className="w-4 h-4 text-orange-500 animate-pulse" /> Popular Trending Dish
                        </h3>

                        {trendingItem ? (
                            <div className="pt-2 space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className={`w-2.5 h-2.5 rounded-full ${trendingItem.isVeg ? 'bg-green-600' : 'bg-red-600'}`} title={trendingItem.isVeg ? 'Veg' : 'Non-Veg'} />
                                    <span className="text-sm font-black text-[#4E1414] leading-tight line-clamp-2">{trendingItem.name}</span>
                                </div>
                                <p className="text-xs text-gray-500 font-medium">Portions Sold: <span className="font-bold text-[#C9974A] text-sm">{trendingItem.qty} orders</span></p>
                            </div>
                        ) : (
                            <div className="pt-2">
                                <p className="text-xs text-gray-400 italic">No portion sales recorded yet this shift.</p>
                            </div>
                        )}
                    </div>

                    <div className="bg-[#F6EEDF]/40 border border-[#C9974A]/25 rounded-xl p-2.5 text-[10px] text-gray-600 font-semibold z-10">
                        {trendingItem
                            ? '🔥 This signature recipe is currently the highest grossing dish of the shift!'
                            : '💡 Once orders are settled, the highest selling item will appear here.'}
                    </div>
                </div>
            )}

            {/* ── BENTO 7: Daily Register Session Drawer ── */}
            {isWidgetVisible('cash_register') && (
                <div className="bg-white border border-[#C9974A]/30 p-5 rounded-3xl shadow-sm md:col-span-12 space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-[#C9974A]/10">
                        <h3 className="font-bold text-xs uppercase tracking-wider text-[#C9974A] flex items-center gap-1.5">
                            <Activity className="w-4 h-4 text-[#C9974A]" /> Cash Drawer Register Session
                        </h3>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${isRegisterOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'
                            }`}>STATUS: {isRegisterOpen ? '✓ OPEN' : '✗ CLOSED'}</span>
                    </div>

                    {isRegisterOpen ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                            <div>
                                <span className="text-[9px] font-bold text-gray-400 uppercase">Opening Float</span>
                                <p className="text-sm font-black mt-0.5">{fmt(openingFloat)}</p>
                            </div>
                            <div>
                                <span className="text-[9px] font-bold text-gray-400 uppercase">Cash Sales</span>
                                <p className="text-sm font-black mt-0.5 text-green-700">{fmt(dayStats.cashSales)}</p>
                            </div>
                            <div>
                                <span className="text-[9px] font-bold text-gray-400 uppercase">Expected Drawer</span>
                                <p className="text-sm font-black mt-0.5 text-green-700">{fmt(expectedCash)}</p>
                            </div>
                            <button
                                onClick={() => handleSidebarAction('Drawer Session', 'view_billing')}
                                className="bg-[#4E1414] hover:bg-[#3b0e0e] text-[#F6EEDF] font-bold px-3 py-1.5 rounded-lg text-[10px] transition-colors cursor-pointer"
                            >
                                Drawer Balancing Settings
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 flex-1">
                                <label className="text-xs font-bold text-gray-500 whitespace-nowrap">Opening Float (₹):</label>
                                <input
                                    type="number"
                                    value={newFloat}
                                    onChange={e => setNewFloat(Number(e.target.value))}
                                    min={0}
                                    className="flex-1 border border-[#C9974A]/40 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#C9974A]/40"
                                />
                            </div>
                            <button
                                onClick={() => handleOpenSession(newFloat)}
                                className="bg-green-700 hover:bg-green-800 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors whitespace-nowrap cursor-pointer"
                            >
                                ✓ Open Register Session
                            </button>
                            <p className="text-[10px] text-gray-400 italic">Register is closed — open it to track cash drawer balance.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
