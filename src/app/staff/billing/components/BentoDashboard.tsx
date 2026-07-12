"use client";

import { AdminTablesLive } from '@/app/staff/admin/components/AdminTablesLive';
import { 
    LayoutGrid, BookOpen, ChefHat, CalendarRange, User, Activity 
} from 'lucide-react';
import { fmt } from './utils';

interface Props {
    tables: any[];
    handleSelectTable: (table: any) => void;
    hasPerm: (perm: string) => boolean;
    menuItemsList: any[];
    handleToggleItemStock: (itemId: string, currentVal: boolean) => void;
    activeOrders: any[];
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
}

export function BentoDashboard({
    tables,
    handleSelectTable,
    hasPerm,
    menuItemsList,
    handleToggleItemStock,
    activeOrders,
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
    handleSidebarAction
}: Props) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Bento 1: Table Floor Grid Map Reusable Integration */}
            <div className="bg-white border border-[#C9974A]/30 p-5 rounded-3xl shadow-sm md:col-span-12 space-y-4">
                <div className="flex flex-wrap justify-between items-center pb-2 border-b border-[#C9974A]/10 gap-3">
                    <h3 className="font-bold text-sm uppercase tracking-wider text-[#4E1414] flex items-center gap-1.5">
                        <LayoutGrid className="w-4 h-4 text-[#C9974A]" /> Dine-In Table Floor Map & QR Manager
                    </h3>
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

            {/* Bento 2: Stock Inventory */}
            <div className="bg-white border border-[#C9974A]/30 p-5 rounded-3xl shadow-sm md:col-span-6 space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#C9974A] flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-[#C9974A]" /> Instant Menu Stock Availability
                </h3>
                <div className="space-y-2 max-h-[170px] overflow-y-auto pr-1">
                    {menuItemsList.map(item => (
                        <div key={item.id} className="flex justify-between items-center text-xs py-1 border-b border-[#C9974A]/10 last:border-b-0">
                            <span className="font-semibold truncate max-w-[170px]">{item.name}</span>
                            <button
                                onClick={() => handleToggleItemStock(item.id, item.is_available)}
                                className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase transition-all
                                    ${item.is_available ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}
                            >
                                {item.is_available ? 'In Stock' : 'No Stock'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bento 3: Live KOT Kitchen Tickets Monitor */}
            <div className="bg-white border border-[#C9974A]/30 p-5 rounded-3xl shadow-sm md:col-span-6 space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#C9974A] flex items-center gap-1.5">
                    <ChefHat className="w-4 h-4 text-[#C9974A]" /> Live KOT tickets monitor
                </h3>
                <div className="space-y-2 max-h-[170px] overflow-y-auto pr-1">
                    {activeOrders.map(order => {
                        const elapsed = Math.round((new Date().getTime() - new Date(order.created_at).getTime()) / 60000);
                        return (
                            <div key={order.id} className="flex justify-between items-center text-xs py-1.5 border-b border-[#C9974A]/10 last:border-b-0">
                                <div>
                                    <p className="font-bold text-[#4E1414]">{order.restaurant_tables ? `Table T-${order.restaurant_tables.table_no}` : 'Takeaway'}</p>
                                    <p className="text-[9px] text-gray-400">Items: {order.order_items.length} · {elapsed}m ago</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase
                                    ${order.status === 'ready' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                    {order.status}
                                </span>
                            </div>
                        );
                    })}
                    {activeOrders.length === 0 && (
                        <p className="text-center text-xs text-gray-400 italic py-10">No active kitchen orders.</p>
                    )}
                </div>
            </div>

            {/* Bento 4: Staff attendance entry */}
            <div className="bg-white border border-[#C9974A]/30 p-5 rounded-3xl shadow-sm md:col-span-6 space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#C9974A] flex items-center gap-1.5">
                    <CalendarRange className="w-4 h-4 text-[#C9974A]" /> Staff Attendance Check-in
                </h3>
                <div className="space-y-3 text-xs">
                    <div className="flex gap-2">
                        <select
                            value={attendanceStaffId}
                            onChange={e => setAttendanceStaffId(e.target.value)}
                            className="flex-1 bg-[#F6EEDF]/40 border border-[#C9974A]/40 rounded-xl px-2 py-1.5 text-xs text-[#4E1414] focus:outline-none"
                        >
                            {staffList.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.is_active ? 'Active' : 'Offline'})</option>
                            ))}
                        </select>
                        <button
                            onClick={() => handleStaffAttendance('clock_in')}
                            className="bg-green-700 hover:bg-green-800 text-white font-bold px-3 py-1.5 rounded-lg text-[10px]"
                        >
                            Clock In
                        </button>
                        <button
                            onClick={() => handleStaffAttendance('clock_out')}
                            className="bg-red-700 hover:bg-red-800 text-white font-bold px-3 py-1.5 rounded-lg text-[10px]"
                        >
                            Clock Out
                        </button>
                    </div>

                    {/* Attendance history logs */}
                    <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-1">
                        {attendanceLogs.map(log => (
                            <div key={log.id} className="flex justify-between text-[10px] bg-gray-50 p-1.5 rounded border">
                                <span className="font-semibold">{log.staff_name}</span>
                                <span>In: {new Date(log.clock_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                <span className="text-gray-400">
                                    {log.clock_out ? `Out: ${new Date(log.clock_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 'Active Shift'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bento 5: CRM Guest Database */}
            <div className="bg-white border border-[#C9974A]/30 p-5 rounded-3xl shadow-sm md:col-span-6 space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#C9974A] flex items-center gap-1.5">
                    <User className="w-4 h-4 text-[#C9974A]" /> CRM Guest Database
                </h3>
                <div className="space-y-2 max-h-[170px] overflow-y-auto pr-1">
                    {guests.map((g, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-[#C9974A]/10 last:border-b-0">
                            <div>
                                <p className="font-bold">{g.name}</p>
                                <p className="text-[10px] text-gray-400">{g.phone}</p>
                            </div>
                            <div className="text-right text-[10px] text-gray-400">
                                <p>{g.totalVisits} visits</p>
                                <p className="font-bold text-[#4E1414]">{fmt(g.totalSpent)}</p>
                            </div>
                        </div>
                    ))}
                    {guests.length === 0 && (
                        <p className="text-center text-xs text-gray-400 italic py-8">No guests registered yet.</p>
                    )}
                </div>
            </div>

            {/* Bento 6: Daily Register Session Drawer */}
            <div className="bg-white border border-[#C9974A]/30 p-5 rounded-3xl shadow-sm md:col-span-12 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-[#C9974A]/10">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-[#C9974A] flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-[#C9974A]" /> Cash Drawer Register Session
                    </h3>
                    <span className="text-[10px] font-bold text-gray-400">STATUS: {isRegisterOpen ? 'OPEN' : 'CLOSED'}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                        <span className="text-[9px] font-bold text-gray-400 uppercase">Float</span>
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
                        onClick={() => handleSidebarAction('Drawer Session', 'manage_cash_drawer')}
                        className="bg-[#4E1414] hover:bg-[#3b0e0e] text-[#F6EEDF] font-bold px-3 py-1.5 rounded-lg text-[10px] transition-colors"
                    >
                        Drawer Balancing Settings
                    </button>
                </div>
            </div>

        </div>
    );
}
