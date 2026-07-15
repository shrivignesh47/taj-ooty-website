"use client";

import { useBillingState } from './hooks/useBillingState';
import { BillingHeader } from './components/BillingHeader';
import { BillingSidebar } from './components/BillingSidebar';
import { BillingCheckout } from './components/BillingCheckout';
import { BentoDashboard } from './components/BentoDashboard';
import { BillingTakeaway } from './components/BillingTakeaway';
import { BillingHistory } from './components/BillingHistory';
import { BillingReports } from './components/BillingReports';
import { AdminStaff } from '@/app/staff/admin/components/AdminStaff';
import { AdminTablesLive } from '@/app/staff/admin/components/AdminTablesLive';
import { AdminExport } from '@/app/staff/admin/components/AdminExport';
import { AdminCRM } from '@/app/staff/admin/components/AdminCRM';
import { logoutStaff } from '@/features/ordering/actions/auth';
import { AnimatePresence, motion } from 'framer-motion';
import { 
    X, ShieldAlert, Users, User, LayoutGrid, FileSpreadsheet, Loader2,
    Settings, Activity, TrendingUp, RefreshCw, LogOut, Menu, IndianRupee 
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
                </div>

                {/* Right Area (POS Checkout Settle Panel) */}
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
