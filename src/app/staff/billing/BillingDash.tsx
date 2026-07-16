"use client";

import { useBillingState } from './hooks/useBillingState';
import { BillingHeader } from './components/BillingHeader';
import { BillingSidebar } from './components/BillingSidebar';
import { BillingCheckout } from './components/BillingCheckout';
import { BentoDashboard } from './components/BentoDashboard';
import { BillingTakeaway } from './components/BillingTakeaway';
import { BillingHistory } from './components/BillingHistory';
import { BillingReports } from './components/BillingReports';
import { BillingOnlineOrders } from './components/BillingOnlineOrders';
import { AdminStaff } from '@/app/staff/admin/components/AdminStaff';
import { AdminTablesLive } from '@/app/staff/admin/components/AdminTablesLive';
import { AdminExport } from '@/app/staff/admin/components/AdminExport';
import { AdminCRM } from '@/app/staff/admin/components/AdminCRM';
import { logoutStaff } from '@/features/ordering/actions/auth';
import { simulateOnlineOrder } from '@/features/ordering/actions/adminActions';
import { advanceOrderStatus } from '@/features/ordering/actions/updateOrderStatus';
import { AnimatePresence, motion } from 'framer-motion';
import { 
    X, ShieldAlert, Users, User, LayoutGrid, FileSpreadsheet, Loader2,
    Settings, Activity, TrendingUp, RefreshCw, LogOut, Menu, IndianRupee,
    Play, CheckCircle2, AlertCircle, ShoppingBag, ChefHat, Globe
} from 'lucide-react';
import { fmt } from './components/utils';

export function BillingDash({ activeUser }: { activeUser: any }) {
    const s = useBillingState(activeUser);

    if (s.loading) {
        return (
            <div className="min-h-screen bg-[#F6EEDF] flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="w-10 h-10 animate-spin text-[#4E1414] mx-auto" />
                    <p className="text-sm font-bold text-[#4E1414]">Loading Taj POS Desk...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F6EEDF] text-[#4E1414] flex flex-col font-sans relative overflow-hidden">
            
            {/* ── POS Status Bar Alerts ── */}
            <AnimatePresence>
                {s.deniedPermission && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className="bg-red-700 text-[#F6EEDF] text-xs font-bold py-2.5 px-4 text-center sticky top-0 z-50 flex items-center justify-center gap-2"
                    >
                        <ShieldAlert className="w-4 h-4 animate-bounce" />
                        <span>ACCESS DENIED: Cashier lacks capability: <b className="underline">"{s.deniedPermission}"</b>. Request privileges in Admin Roles page.</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Sleek Light Cashier Header ── */}
            <BillingHeader 
                dayStats={s.dayStats} 
                refreshing={s.refreshing} 
                setIsSidebarOpen={s.setIsSidebarOpen} 
                setRefreshing={s.setRefreshing} 
                loadData={s.loadData} 
                logoutStaff={logoutStaff} 
            />

            {/* ── Main Viewport Content ── */}
            <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Area - Bento Dashboard Grid OR expanded list views */}
                <div className="lg:col-span-8 space-y-6">
                                        {s.view === 'bento' && (
                        <BentoDashboard 
                            tables={s.tables}
                            handleSelectTable={s.handleSelectTable}
                            hasPerm={s.hasPerm}
                            menuItemsList={s.menuItemsList}
                            handleToggleItemStock={s.handleToggleItemStock}
                            activeOrders={s.activeOrders}
                            attendanceStaffId={s.attendanceStaffId}
                            setAttendanceStaffId={s.setAttendanceStaffId}
                            staffList={s.staffList}
                            handleStaffAttendance={s.handleStaffAttendance}
                            attendanceLogs={s.attendanceLogs}
                            guests={s.guests}
                            openingFloat={s.openingFloat}
                            expectedCash={s.expectedCash}
                            dayStats={s.dayStats}
                            isRegisterOpen={s.isRegisterOpen}
                            handleSidebarAction={s.handleSidebarAction}
                            history={s.history}
                        />
                    )}
                    {s.view === 'tables' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h2 className="font-bold text-lg">Tables List Map</h2>
                                <button onClick={() => s.setView('bento')} className="text-xs text-[#C9974A] hover:underline font-bold">← Back to Bento Dashboard</button>
                            </div>
                            <AdminTablesLive 
                                onTableClick={(t) => {
                                    const cashierTable = s.tables.find(x => x.id === t.id);
                                    if (cashierTable) {
                                        s.handleSelectTable(cashierTable);
                                    }
                                }}
                                readOnly={!s.hasPerm('manage_tables')}
                            />
                        </div>
                    )}

                    {s.view === 'takeaway' && (
                        <BillingTakeaway 
                            takeawayOrders={s.takeawayOrders} 
                            setView={s.setView} 
                            handleSelectTable={s.handleSelectTable} 
                            menuItemsList={s.menuItemsList}
                            loadData={s.loadData}
                        />
                    )}

                    {s.view === 'online_orders' && (
                        <BillingOnlineOrders
                            onlineOrders={s.onlineOrders}
                            setView={s.setView}
                            loadData={s.loadData}
                        />
                    )}

                    {s.view === 'history' && (
                        <BillingHistory 
                            history={s.history} 
                            setView={s.setView} 
                        />
                    )}

                    {s.view === 'reports' && (
                        <BillingReports 
                            dayStats={s.dayStats} 
                            setView={s.setView} 
                            selectedReport={s.selectedReport} 
                            setSelectedReport={s.setSelectedReport}
                            history={s.history}
                            menuItemsList={s.menuItemsList}
                        />
                    )}

                    {s.view === 'stock_inventory' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="font-bold text-lg text-[#4E1414]">Menu Stock Availability</h2>
                                    <p className="text-xs text-gray-500 mt-0.5">Update availability and set limited quantities — syncs instantly to all terminals.</p>
                                </div>
                                <button onClick={() => s.setView('bento')} className="text-xs text-[#C9974A] hover:underline font-bold">← Back to Dashboard</button>
                            </div>

                            {/* Search */}
                            <div className="relative">
                                <input
                                    type="text"
                                    id="stock-search"
                                    placeholder="Search menu items..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#C9974A]/30 rounded-xl text-sm font-bold focus:outline-none focus:border-[#C9974A]"
                                    onChange={(e) => {
                                        const q = e.target.value.toLowerCase();
                                        (document.getElementById('stock-item-list') as HTMLElement).querySelectorAll('[data-name]').forEach((el) => {
                                            const name = (el as HTMLElement).dataset.name || '';
                                            (el as HTMLElement).style.display = name.includes(q) ? '' : 'none';
                                        });
                                    }}
                                />
                                <svg className="absolute left-3 top-3 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>

                            {/* Items Grid */}
                            <div id="stock-item-list" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                {s.menuItemsList.map((item: any) => (
                                    <div
                                        key={item.id}
                                        data-name={item.name?.toLowerCase()}
                                        className="bg-white border border-[#C9974A]/20 rounded-2xl p-4 shadow-sm flex flex-col gap-3"
                                    >
                                        {/* Item header */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.is_veg ? 'bg-green-500' : 'bg-red-500'}`} />
                                                    <h4 className="font-extrabold text-sm text-[#4E1414] leading-tight">{item.name}</h4>
                                                </div>
                                                <p className="text-[10px] text-[#C9974A] font-bold mt-0.5">{item.categories?.name || 'Item'} · ₹{item.price}</p>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase flex-shrink-0 ${
                                                !item.is_available
                                                    ? 'bg-red-100 text-red-700 border border-red-200'
                                                    : item.stock_qty !== null
                                                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                                        : 'bg-green-100 text-green-700 border border-green-200'
                                            }`}>
                                                {!item.is_available ? 'Out of Stock' : item.stock_qty !== null ? `Limited: ${item.stock_qty}` : 'In Stock'}
                                            </span>
                                        </div>

                                        {/* Action row */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <button
                                                onClick={() => s.handleUpdateMenuStock(item.id, true, null)}
                                                className="px-3 py-1.5 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 text-[10px] font-black rounded-lg transition-all cursor-pointer"
                                            >
                                                ✓ In Stock
                                            </button>
                                            <button
                                                onClick={() => s.handleUpdateMenuStock(item.id, false, null)}
                                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-[10px] font-black rounded-lg transition-all cursor-pointer"
                                            >
                                                ✗ Out of Stock
                                            </button>
                                            <div className="flex items-center gap-1 ml-auto">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    placeholder="Qty"
                                                    defaultValue={item.stock_qty !== null ? item.stock_qty : ''}
                                                    onBlur={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        if (!isNaN(val) && val > 0) {
                                                            s.handleUpdateMenuStock(item.id, true, val);
                                                        } else if (e.target.value === '') {
                                                            s.handleUpdateMenuStock(item.id, true, null);
                                                        }
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            const val = parseInt((e.target as HTMLInputElement).value);
                                                            if (!isNaN(val) && val > 0) {
                                                                s.handleUpdateMenuStock(item.id, true, val);
                                                            }
                                                        }
                                                    }}
                                                    className="w-14 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-[10px] font-bold text-center focus:outline-none focus:border-[#C9974A]"
                                                />
                                                <span className="text-[10px] text-gray-400 font-bold">Limit</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {s.menuItemsList.length === 0 && (
                                    <p className="col-span-full text-center py-16 text-gray-400 text-sm italic">No menu items loaded.</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Area (POS Checkout Settle Panel & Aggregator Notification Bento Box) */}
                <div className="lg:col-span-4 flex flex-col gap-6 sticky top-24 self-start">
                    <BillingCheckout 
                        selectedTable={s.selectedTable}
                        setSelectedTable={s.setSelectedTable}
                        isRegisterOpen={s.isRegisterOpen}
                        canSettleBills={s.canSettleBills}
                        paymentMethod={s.paymentMethod}
                        setPaymentMethod={s.setPaymentMethod}
                        submittingPayment={s.submittingPayment}
                        billPrinted={s.billPrinted}
                        discountType={s.discountType}
                        setDiscountType={s.setDiscountType}
                        discountValue={s.discountValue}
                        setDiscountValue={s.setDiscountValue}
                        appliedCoupon={s.appliedCoupon}
                        setAppliedCoupon={s.setAppliedCoupon}
                        isSplitEnabled={s.isSplitEnabled}
                        setIsSplitEnabled={s.setIsSplitEnabled}
                        splitGuests={s.splitGuests}
                        setSplitGuests={s.setSplitGuests}
                        settings={s.settings}
                        handlePrintBill={s.handlePrintBill}
                        handleSettlePayment={s.handleSettlePayment}
                        getCheckoutCalculation={s.getCheckoutCalculation}
                        handleApplyCoupon={s.handleApplyCoupon}
                    />

                    {/* Swiggy & Zomato Realtime Notification Bento Card */}
                    <div className="bg-white border border-[#C9974A]/30 rounded-3xl p-5 shadow-sm space-y-4">
                        {/* Header */}
                        <div className="flex justify-between items-center pb-3 border-b border-[#C9974A]/25">
                            <div className="flex items-center gap-2">
                                <Globe className="w-4 h-4 text-[#C9974A] animate-spin" style={{ animationDuration: '6s' }} />
                                <div>
                                    <h4 className="font-bold text-xs text-[#4E1414]">Aggregator Gates</h4>
                                    <p className="text-[9px] text-gray-400">Live order sync alerts</p>
                                </div>
                            </div>
                            
                            {/* Small quick settings toggles */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => s.toggleAggregator('swiggy')}
                                    className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer border
                                        ${s.restaurantSettings?.swiggy_enabled 
                                            ? 'bg-[#FC8019]/10 border-[#FC8019] text-[#FC8019]' 
                                            : 'bg-gray-50 border-gray-200 text-gray-400'}`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${s.restaurantSettings?.swiggy_enabled ? 'bg-[#FC8019] animate-ping' : 'bg-gray-300'}`} />
                                    Swiggy
                                </button>
                                <button
                                    onClick={() => s.toggleAggregator('zomato')}
                                    className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer border
                                        ${s.restaurantSettings?.zomato_enabled 
                                            ? 'bg-[#E23744]/10 border-[#E23744] text-[#E23744]' 
                                            : 'bg-gray-50 border-gray-200 text-gray-400'}`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${s.restaurantSettings?.zomato_enabled ? 'bg-[#E23744] animate-ping' : 'bg-gray-300'}`} />
                                    Zomato
                                </button>
                            </div>
                        </div>

                        {/* List of active pending / confirmed aggregator orders */}
                        <div className="space-y-3 max-h-[300px] overflow-y-auto taj-scrollbar-dark pr-1">
                            {s.onlineOrders.filter((o: any) => ['pending', 'confirmed'].includes(o.status)).map((order: any) => {
                                const orderTotalAmt = order.order_items.reduce((acc: number, i: any) => acc + (i.price_at_order * i.qty), 0);
                                const brandColor = order.source === 'swiggy' ? '#FC8019' : '#E23744';
                                const brandLetter = order.source === 'swiggy' ? 'S' : 'Z';
                                const isPending = order.status === 'pending';

                                return (
                                    <div key={order.id} className="bg-gray-50 border border-gray-100 rounded-2xl p-3 space-y-2.5">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2">
                                                <span 
                                                    style={{ backgroundColor: brandColor }} 
                                                    className="w-6 h-6 rounded-lg text-white font-black text-xs flex items-center justify-center shadow"
                                                >
                                                    {brandLetter}
                                                </span>
                                                <div>
                                                    <span className="font-extrabold text-xs text-[#4E1414]">{order.customer_name}</span>
                                                    <p className="text-[8px] text-gray-400">Total: {fmt(orderTotalAmt)}</p>
                                                </div>
                                            </div>
                                            
                                            {/* Cancel order button */}
                                            <button
                                                onClick={async () => {
                                                    if (confirm('Cancel this online order?')) {
                                                        const res = await advanceOrderStatus(order.id, 'cancelled');
                                                        if ('error' in res) alert(res.error);
                                                        else s.loadData();
                                                    }
                                                }}
                                                className="text-[9px] text-red-500 hover:text-red-700 font-extrabold cursor-pointer transition-colors"
                                            >
                                                Reject / Cancel
                                            </button>
                                        </div>

                                        {/* Items */}
                                        <div className="text-[10px] text-gray-600 bg-white rounded-lg p-2 border border-gray-100">
                                            {order.order_items.map((i: any, idx: number) => (
                                                <div key={idx} className="flex justify-between">
                                                    <span>{i.menu_items?.name}</span>
                                                    <span className="font-semibold">x{i.qty}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2">
                                            {isPending ? (
                                                <button
                                                    onClick={async () => {
                                                        const res = await advanceOrderStatus(order.id, 'confirmed');
                                                        if ('error' in res) alert(res.error);
                                                        else s.loadData();
                                                    }}
                                                    style={{ backgroundColor: brandColor }}
                                                    className="flex-1 text-white font-extrabold text-[10px] py-1.5 rounded-lg flex items-center justify-center gap-1 shadow-xs hover:brightness-95 transition-all cursor-pointer"
                                                >
                                                    <CheckCircle2 className="w-3 h-3" /> Accept Order
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={async () => {
                                                        const res = await advanceOrderStatus(order.id, 'preparing');
                                                        if ('error' in res) alert(res.error);
                                                        else s.loadData();
                                                    }}
                                                    className="flex-1 bg-[#4E1414] hover:bg-[#3d0f0f] text-[#F6EEDF] font-extrabold text-[10px] py-1.5 rounded-lg flex items-center justify-center gap-1 shadow-xs transition-all cursor-pointer"
                                                >
                                                    <ChefHat className="w-3 h-3 text-[#C9974A]" /> Move to Kitchen
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {s.onlineOrders.filter((o: any) => ['pending', 'confirmed'].includes(o.status)).length === 0 && (
                                <div className="text-center py-6 border border-dashed border-gray-100 rounded-2xl flex flex-col justify-center items-center gap-2">
                                    <CheckCircle2 className="w-6 h-6 text-green-500 opacity-60" />
                                    <p className="text-[10px] text-gray-400 font-bold">No active aggregator alerts</p>
                                    
                                    {/* Quick simulators */}
                                    <div className="flex gap-1.5 mt-1.5">
                                        <button
                                            disabled={!s.restaurantSettings?.swiggy_enabled}
                                            onClick={async () => {
                                                const res = await simulateOnlineOrder('swiggy');
                                                if (!res.success) alert(res.error);
                                                else s.loadData();
                                            }}
                                            className="px-2.5 py-1 bg-gray-50 border border-gray-200 text-gray-500 hover:bg-[#FC8019]/10 hover:border-[#FC8019]/30 hover:text-[#FC8019] rounded-lg text-[8px] font-black uppercase transition-all disabled:opacity-40 cursor-pointer"
                                        >
                                            + Swiggy
                                        </button>
                                        <button
                                            disabled={!s.restaurantSettings?.zomato_enabled}
                                            onClick={async () => {
                                                const res = await simulateOnlineOrder('zomato');
                                                if (!res.success) alert(res.error);
                                                else s.loadData();
                                            }}
                                            className="px-2.5 py-1 bg-gray-50 border border-gray-200 text-gray-500 hover:bg-[#E23744]/10 hover:border-[#E23744]/30 hover:text-[#E23744] rounded-lg text-[8px] font-black uppercase transition-all disabled:opacity-40 cursor-pointer"
                                        >
                                            + Zomato
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* ── Left Collapsible Sliding Drawer (Operations Sidebar) ── */}
            <AnimatePresence>
                {s.isSidebarOpen && (
                    <BillingSidebar 
                        isSidebarOpen={s.isSidebarOpen} 
                        setIsSidebarOpen={s.setIsSidebarOpen} 
                        hasPerm={s.hasPerm} 
                        handleSidebarAction={s.handleSidebarAction} 
                    />
                )}
            </AnimatePresence>

            {/* ── Sub-Modals for Drawer and Overlays ── */}
            <AnimatePresence>
                {s.activeOpModal === 'Drawer Session' && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-[#C9974A]/30"
                        >
                            <div className="bg-[#4E1414] px-6 py-4 flex justify-between items-center">
                                <h3 className="text-[#F6EEDF] font-bold text-sm">Close Cash Drawer Shift</h3>
                                <button onClick={() => s.setActiveOpModal(null)} className="text-[#F6EEDF]/80 hover:text-white"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="p-6 space-y-4 text-xs">
                                <div>
                                    <label className="block text-gray-400 font-bold mb-1 uppercase tracking-wide">Enter Total Cash in Drawer</label>
                                    <input
                                        type="number"
                                        value={s.actualClosingCash || ''}
                                        onChange={e => s.setActualClosingCash(Math.max(0, parseFloat(e.target.value) || 0))}
                                        className="w-full bg-[#F6EEDF]/30 border border-[#C9974A]/30 rounded-xl py-2.5 px-3 focus:outline-none"
                                        placeholder="₹0.00"
                                    />
                                </div>
                                <div className="bg-[#F6EEDF]/40 p-4 rounded-xl border border-[#C9974A]/20 space-y-1">
                                    <div className="flex justify-between"><span>Expected Drawer Float</span><span className="font-bold">{fmt(s.expectedCash)}</span></div>
                                    <div className="flex justify-between font-black text-sm text-[#4E1414] border-t pt-2 mt-2">
                                        <span>Variance Difference</span>
                                        <span className={s.actualClosingCash - s.expectedCash >= 0 ? 'text-green-700' : 'text-red-700'}>
                                            {fmt(s.actualClosingCash - s.expectedCash)}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={s.handleCloseSession}
                                    className="w-full bg-[#4E1414] hover:bg-[#3b0e0e] text-[#F6EEDF] font-bold py-2.5 rounded-xl transition-colors mt-2"
                                >
                                    Verify & Close Drawer
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {s.activeOpModal === 'Petty Expenses' && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-[#C9974A]/30"
                        >
                            <div className="bg-[#4E1414] px-6 py-4 flex justify-between items-center">
                                <h3 className="text-[#F6EEDF] font-bold text-sm">Add Petty Cash Expense</h3>
                                <button onClick={() => s.setActiveOpModal(null)} className="text-[#F6EEDF]/80 hover:text-white"><X className="w-4 h-4" /></button>
                            </div>
                            <form onSubmit={s.handleAddExpense} className="p-6 space-y-4 text-xs">
                                <div>
                                    <label className="block text-gray-400 font-bold mb-1 uppercase tracking-wide">Expense Purpose / Vendor</label>
                                    <input
                                        type="text"
                                        required
                                        value={s.newExpensePurpose}
                                        onChange={e => s.setNewExpensePurpose(e.target.value)}
                                        className="w-full bg-[#F6EEDF]/30 border border-[#C9974A]/30 rounded-xl py-2.5 px-3 focus:outline-none"
                                        placeholder="e.g. Milk & Dairy Supply"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-400 font-bold mb-1 uppercase tracking-wide">Paid Amount</label>
                                    <input
                                        type="number"
                                        required
                                        value={s.newExpenseAmount || ''}
                                        onChange={e => s.setNewExpenseAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                                        className="w-full bg-[#F6EEDF]/30 border border-[#C9974A]/30 rounded-xl py-2.5 px-3 focus:outline-none"
                                        placeholder="₹0.00"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full bg-[#4E1414] hover:bg-[#3b0e0e] text-[#F6EEDF] font-bold py-2.5 rounded-xl transition-colors mt-2"
                                >
                                    Log Petty Expense
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}

                {s.activeOpModal === 'GST Settings' && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-[#C9974A]/30"
                        >
                            <div className="bg-[#4E1414] px-6 py-4 flex justify-between items-center">
                                <h3 className="text-[#F6EEDF] font-bold text-sm flex items-center gap-1.5">
                                    <Settings className="w-4 h-4 text-[#C9974A]" /> GST Tax Calculations Configuration
                                </h3>
                                <button onClick={() => s.setActiveOpModal(null)} className="text-[#F6EEDF]/80 hover:text-white"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="p-6 space-y-4 text-xs">
                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                    <div>
                                        <p className="font-bold text-[#4E1414]">Inclusive GST Calculation</p>
                                        <p className="text-[10px] text-gray-400">Calculate CGST/SGST within bill total</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={s.settings.isGstInclusive}
                                        onChange={e => s.setSettings(prev => ({ ...prev, isGstInclusive: e.target.checked }))}
                                        className="rounded border-[#C9974A]/40 text-[#4E1414] focus:ring-0"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-400 font-bold mb-1 uppercase tracking-wide">Indian GST Rate (%)</label>
                                    <input
                                        type="number"
                                        value={s.settings.gstRate}
                                        onChange={e => s.setSettings(prev => ({ ...prev, gstRate: Math.max(0, parseFloat(e.target.value) || 0) }))}
                                        className="w-full bg-[#F6EEDF]/30 border border-[#C9974A]/30 rounded-xl py-2.5 px-3 focus:outline-none"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-center">
                                    <div className="bg-gray-50 p-2.5 rounded-lg border">
                                        <span className="text-[9px] text-gray-400 uppercase font-bold">CGST (Auto 50%)</span>
                                        <p className="text-sm font-black text-[#4E1414] mt-0.5">{(s.settings.gstRate / 2)}%</p>
                                    </div>
                                    <div className="bg-gray-50 p-2.5 rounded-lg border">
                                        <span className="text-[9px] text-gray-400 uppercase font-bold">SGST (Auto 50%)</span>
                                        <p className="text-sm font-black text-[#4E1414] mt-0.5">{(s.settings.gstRate / 2)}%</p>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center py-2 border-t pt-3 border-gray-100">
                                    <div>
                                        <p className="font-bold text-[#4E1414]">Service Fee (10%)</p>
                                        <p className="text-[10px] text-gray-400">Add service charges to invoices</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={s.settings.chargeServiceTax}
                                        onChange={e => s.setSettings(prev => ({ ...prev, chargeServiceTax: e.target.checked }))}
                                        className="rounded border-[#C9974A]/40 text-[#4E1414] focus:ring-0"
                                    />
                                </div>

                                <button
                                    onClick={() => s.setActiveOpModal(null)}
                                    className="w-full bg-[#4E1414] hover:bg-[#3b0e0e] text-[#F6EEDF] font-bold py-2.5 rounded-xl transition-colors mt-2"
                                >
                                    Apply Configuration
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {s.activeOpModal === 'Staff Roster' && (
                    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-[#F6EEDF] w-full max-w-5xl rounded-2xl shadow-xl overflow-hidden border border-[#C9974A]/30 flex flex-col max-h-[90vh]"
                        >
                            <div className="bg-[#4E1414] px-6 py-4 flex justify-between items-center shrink-0">
                                <h3 className="text-[#F6EEDF] font-black text-lg flex items-center gap-2">
                                    <Users className="w-5 h-5 text-[#C9974A]" /> Staff Roster Management
                                </h3>
                                <button onClick={() => { s.setActiveOpModal(null); s.loadData(); }} className="text-[#F6EEDF]/80 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto taj-scrollbar">
                                <AdminStaff staff={s.staffList} roles={s.rolesList} onStaffUpdated={s.loadData} />
                            </div>
                        </motion.div>
                    </div>
                )}

                {s.activeOpModal === 'Table Configuration' && (
                    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-[#F6EEDF] w-full max-w-5xl rounded-2xl shadow-xl overflow-hidden border border-[#C9974A]/30 flex flex-col max-h-[90vh]"
                        >
                            <div className="bg-[#4E1414] px-6 py-4 flex justify-between items-center shrink-0">
                                <h3 className="text-[#F6EEDF] font-black text-lg flex items-center gap-2">
                                    <LayoutGrid className="w-5 h-5 text-[#C9974A]" /> Physical Table Configurations
                                </h3>
                                <button onClick={() => { s.setActiveOpModal(null); s.loadData(); }} className="text-[#F6EEDF]/80 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto taj-scrollbar">
                                <AdminTablesLive />
                            </div>
                        </motion.div>
                    </div>
                )}

                {s.activeOpModal === 'Export' && (
                    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-[#F6EEDF] w-full max-w-5xl rounded-2xl shadow-xl overflow-hidden border border-[#C9974A]/30 flex flex-col max-h-[90vh]"
                        >
                            <div className="bg-[#4E1414] px-6 py-4 flex justify-between items-center shrink-0">
                                <h3 className="text-[#F6EEDF] font-black text-lg flex items-center gap-2">
                                    <FileSpreadsheet className="w-5 h-5 text-[#C9974A]" /> Export Data (Excel)
                                </h3>
                                <button onClick={() => s.setActiveOpModal(null)} className="text-[#F6EEDF]/80 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto taj-scrollbar">
                                <AdminExport 
                                    orders={s.history} 
                                    menu={s.menuItemsList} 
                                    staff={s.staffList} 
                                    customers={s.guests.map(g => ({
                                        phone: g.phone,
                                        name: g.name,
                                        visits: g.totalVisits,
                                        totalSpent: g.totalSpent,
                                        lastVisit: g.lastVisit || new Date().toISOString()
                                    }))} 
                                />
                            </div>
                        </motion.div>
                    </div>
                )}

                {s.activeOpModal === 'CRM Customers' && (
                    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-[#F6EEDF] w-full max-w-5xl rounded-2xl shadow-xl overflow-hidden border border-[#C9974A]/30 flex flex-col max-h-[90vh]"
                        >
                            <div className="bg-[#4E1414] px-6 py-4 flex justify-between items-center shrink-0">
                                <h3 className="text-[#F6EEDF] font-black text-lg flex items-center gap-2">
                                    <User className="w-5 h-5 text-[#C9974A]" /> Guests CRM Database
                                </h3>
                                <button onClick={() => s.setActiveOpModal(null)} className="text-[#F6EEDF]/80 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto taj-scrollbar bg-white">
                                <AdminCRM 
                                    customers={s.guests} 
                                    orders={s.history} 
                                    settings={s.settings}
                                />
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
