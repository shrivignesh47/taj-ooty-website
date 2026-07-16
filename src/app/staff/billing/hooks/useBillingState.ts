"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/features/ordering/lib/supabase';
import { advanceOrderStatus } from '@/features/ordering/actions/updateOrderStatus';
import { orderTotal } from '../components/utils';
import {
    TableView, CashierOrder, GuestRecord, StaffUser, AttendanceLog,
    MainView, PayMethod, DayStats, PettyCashEntry
} from '../types';

export const PRESET_COUPONS = [
    { code: 'TAJ10', type: 'pct', value: 10, description: '10% Restaurant Special' },
    { code: 'WELCOME50', type: 'amt', value: 50, description: '₹50 Flat Welcome Discount' },
    { code: 'FESTIVE15', type: 'pct', value: 15, description: '15% Festive Occasion Discount' },
    { code: 'VIP200', type: 'amt', value: 200, description: '₹200 Flat VIP Discount' }
];

export function useBillingState(activeUser: any) {
    const [view, setView] = useState<MainView>('bento');
    const [tables, setTables] = useState<TableView[]>([]);
    const [activeOrders, setActiveOrders] = useState<CashierOrder[]>([]);
    const [history, setHistory] = useState<CashierOrder[]>([]);
    const [menuItemsList, setMenuItemsList] = useState<any[]>([]);
    const [guests, setGuests] = useState<GuestRecord[]>([]);
    const [staffList, setStaffList] = useState<StaffUser[]>([]);
    const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Dynamic Permission & Role state overrides to reflect updates instantly
    const [currentPermissions, setCurrentPermissions] = useState<string[]>(activeUser.permissions || []);
    const [currentRoleName, setCurrentRoleName] = useState<string>(activeUser.roleName || 'Cashier');

    // Sidebar selected table
    const [selectedTable, setSelectedTable] = useState<TableView | null>(null);

    // Bill adjustments state
    const [discountType, setDiscountType] = useState<'amt' | 'pct'>('amt');
    const [discountValue, setDiscountValue] = useState<number>(0);
    const [appliedCoupon, setAppliedCoupon] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<PayMethod>('cash');
    const [submittingPayment, setSubmittingPayment] = useState(false);
    const [billPrinted, setBillPrinted] = useState(false);

    // Split Billing State
    const [isSplitEnabled, setIsSplitEnabled] = useState(false);
    const [splitGuests, setSplitGuests] = useState(2);

    // Day stats & registers
    const [dayStats, setDayStats] = useState<DayStats>({
        revenue: 0, bills: 0, avgBill: 0, activeTables: 0,
        cashSales: 0, cardSales: 0, upiSales: 0
    });

    // Cash Register Session
    const [isRegisterOpen, setIsRegisterOpen] = useState(true);
    const [openingFloat, setOpeningFloat] = useState(2500);
    const [expectedCash, setExpectedCash] = useState(2500);
    const [actualClosingCash, setActualClosingCash] = useState(0);
    const [registerLogs, setRegisterLogs] = useState<any[]>([]);

    // Petty Cash Expenses
    const [expenses, setExpenses] = useState<PettyCashEntry[]>([]);
    const [newExpensePurpose, setNewExpensePurpose] = useState('');
    const [newExpenseAmount, setNewExpenseAmount] = useState<number>(0);

    // Takeaway Orders (Not tied to table)
    const [takeawayOrders, setTakeawayOrders] = useState<CashierOrder[]>([]);
    const [onlineOrders, setOnlineOrders] = useState<CashierOrder[]>([]);
    const [restaurantSettings, setRestaurantSettings] = useState<any>(null);

    // Sliding Sidebar state
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // POS & GST settings
    const [settings, setSettings] = useState({
        printerSize: '80mm',
        autoPrint: true,
        chargeServiceTax: false,
        serviceChargeRate: 0,
        gstRate: 5,
        isGstInclusive: false,
        headerNote: 'Hotel Taj Ooty',
        footerNote: 'Thank You! Please Visit Again.'
    });

    // Modal control for overlays
    const [activeOpModal, setActiveOpModal] = useState<string | null>(null);
    const [deniedPermission, setDeniedPermission] = useState<string | null>(null);
    const [selectedReport, setSelectedReport] = useState<string>('Sales Summary');

    // Attendance form state
    const [attendanceStaffId, setAttendanceStaffId] = useState('');

    // Staff Roster Management State
    const [rolesList, setRolesList] = useState<any[]>([]);

    const hasPerm = (requiredPerm: string) => {
        if (currentRoleName?.toLowerCase() === 'admin') return true;
        return currentPermissions.includes(requiredPerm);
    };

    const canApplyDiscount = hasPerm('edit_menu') || hasPerm('generate_bills');
    const canSettleBills = hasPerm('generate_bills');

    const loadData = useCallback(async () => {
        const [tablesRes, activeRes, historyRes, menuItemsRes, staffRes, attendanceRes, rolesRes, settingsRes] = await Promise.all([
            supabase.from('restaurant_tables').select('id, table_no, assigned_waiter_id').order('table_no'),
            supabase.from('orders')
                .select(`id, status, created_at, customer_name, customer_phone, table_id, source, token_no,
                    restaurant_tables(id, table_no),
                    order_items(id, qty, price_at_order, notes, menu_items(name, is_veg, id))`)
                .in('status', ['pending', 'confirmed', 'preparing', 'ready', 'served'])
                .order('created_at', { ascending: true }),
            supabase.from('orders')
                .select(`id, status, created_at, customer_name, customer_phone, table_id, source, token_no,
                    restaurant_tables(id, table_no),
                    order_items(id, qty, price_at_order, notes, menu_items(name, is_veg, id))`)
                .eq('status', 'billed')
                .order('created_at', { ascending: false })
                .limit(100),
            supabase.from('menu_items').select('*, categories(id, name)').order('name'),
            supabase.from('staff_users').select('*, roles(name)').order('name'),
            supabase.from('staff_attendance').select('id, staff_id, clock_in, clock_out, staff_users(name)').order('clock_in', { ascending: false }).limit(20),
            supabase.from('roles').select('id, name').order('name'),
            supabase.from('restaurant_settings').select('*').limit(1).maybeSingle()
        ]);

        // Realtime dynamic permissions fetch
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: staffMember } = await supabase
                .from('staff_users')
                .select(`
                    id,
                    roles (
                        name,
                        role_permissions (
                            permissions (
                                key
                            )
                        )
                    )
                `)
                .eq('auth_id', user.id)
                .single();

            if (staffMember) {
                const roleData: any = staffMember.roles;
                const perms = new Set<string>();
                if (roleData?.role_permissions) {
                    roleData.role_permissions.forEach((rp: any) => {
                        if (!rp.permissions) return;
                        if (Array.isArray(rp.permissions)) {
                            rp.permissions.forEach((p: any) => {
                                if (p?.key) perms.add(p.key);
                            });
                        } else if (rp.permissions?.key) {
                            perms.add(rp.permissions.key);
                        }
                    });
                }
                if (roleData?.name?.toLowerCase() === 'admin') {
                    const { data: allPerms } = await supabase.from('permissions').select('key');
                    allPerms?.forEach(p => perms.add(p.key));
                }
                setCurrentPermissions(Array.from(perms));
                setCurrentRoleName(roleData?.name || 'Cashier');
            }
        }

        if (settingsRes && settingsRes.data) {
            setRestaurantSettings(settingsRes.data);
        }

        const rawTables = tablesRes.data ?? [];
        const rawOrders = (activeRes.data ?? []) as unknown as CashierOrder[];
        const rawHistory = (historyRes.data ?? []) as unknown as CashierOrder[];

        if (menuItemsRes.data) setMenuItemsList(menuItemsRes.data);
        if (rolesRes.data) setRolesList(rolesRes.data);
        if (staffRes.data) {
            setStaffList(staffRes.data);
            if (staffRes.data.length > 0 && !attendanceStaffId) {
                setAttendanceStaffId(staffRes.data[0].id);
            }
        }
        if (attendanceRes.data) {
            const mappedAttendance: AttendanceLog[] = (attendanceRes.data as any[]).map((a: any) => ({
                id: a.id,
                staff_id: a.staff_id,
                clock_in: a.clock_in,
                clock_out: a.clock_out,
                staff_name: a.staff_users?.name ?? 'Unknown Staff'
            }));
            setAttendanceLogs(mappedAttendance);
        }

        const activeDineIn = rawOrders.filter(o => (o.source === 'dine_in' || !o.source) && o.table_id !== null);
        const activeTakeaway = rawOrders.filter(o => o.source === 'takeaway' || (!o.source && o.table_id === null));
        const activeOnline = rawOrders.filter(o => o.source === 'swiggy' || o.source === 'zomato');
        setTakeawayOrders(activeTakeaway);
        setOnlineOrders(activeOnline);
        setActiveOrders(rawOrders);

        const enriched: TableView[] = rawTables.map((t: any) => {
            const tOrders = activeDineIn.filter(o => o.table_id === t.id);
            const bill = tOrders.reduce((s, o) =>
                s + o.order_items.reduce((ss, i) => ss + i.price_at_order * i.qty, 0), 0);

            let status: TableView['status'] = 'Empty';
            if (tOrders.length > 0) {
                const allServedOrReady = tOrders.every(o => ['served', 'ready'].includes(o.status));
                status = allServedOrReady ? 'Awaiting Settlement' : 'Occupied';
            }

            return {
                id: t.id, table_no: t.table_no, status,
                currentBill: bill,
                customer_name: tOrders[0]?.customer_name,
                customer_phone: tOrders[0]?.customer_phone ?? undefined,
                orders: tOrders,
                latestStatus: tOrders[0]?.status ?? '',
            };
        });

        const today = new Date();
        const todayBills = rawHistory.filter(o => {
            const d = new Date(o.created_at);
            return d.toDateString() === today.toDateString();
        });

        const guestMap = new Map<string, { name: string; phone: string; totalVisits: number; totalSpent: number; lastVisit: string }>();
        const aggregateOrders = [...rawOrders, ...rawHistory];
        aggregateOrders.forEach(o => {
            if (o.customer_phone) {
                const existing = guestMap.get(o.customer_phone);
                const sub = o.order_items.reduce((s, i) => s + i.price_at_order * i.qty, 0) * 1.15;
                if (existing) {
                    existing.totalVisits += 1;
                    existing.totalSpent += sub;
                    if (new Date(o.created_at).getTime() > new Date(existing.lastVisit).getTime()) {
                        existing.lastVisit = o.created_at;
                    }
                } else {
                    guestMap.set(o.customer_phone, {
                        name: o.customer_name,
                        phone: o.customer_phone,
                        totalVisits: 1,
                        totalSpent: sub,
                        lastVisit: o.created_at
                    });
                }
            }
        });
        setGuests(Array.from(guestMap.values()));

        const rev = todayBills.reduce((s, o) => {
            const sub = orderTotal(o);
            if (settings.isGstInclusive) {
                const service = settings.chargeServiceTax ? (sub / (1 + (settings.gstRate / 100))) * (settings.serviceChargeRate / 100) : 0;
                return s + sub + service;
            } else {
                const gst = sub * (settings.gstRate / 100);
                const service = settings.chargeServiceTax ? sub * (settings.serviceChargeRate / 100) : 0;
                return s + sub + gst + service;
            }
        }, 0);

        let cash = 0, card = 0, upi = 0;
        todayBills.forEach((o, idx) => {
            const total = orderTotal(o) * 1.15;
            if (idx % 3 === 0) cash += total;
            else if (idx % 3 === 1) upi += total;
            else card += total;
        });

        setTables(enriched);
        setActiveOrders(rawOrders);
        setHistory(rawHistory);
        setDayStats({
            revenue: rev, bills: todayBills.length,
            avgBill: todayBills.length ? rev / todayBills.length : 0,
            activeTables: enriched.filter(t => t.status !== 'Empty').length,
            cashSales: cash, cardSales: card, upiSales: upi
        });

        const expenseTotal = expenses.reduce((s, e) => s + e.amount, 0);
        setExpectedCash(openingFloat + cash - expenseTotal);

        if (selectedTable) {
            if (selectedTable.table_no === 0) {
                const currentOrder = rawOrders.find(o => o.id === selectedTable.id);
                if (currentOrder) {
                    const total = orderTotal(currentOrder);
                    setSelectedTable({
                        id: currentOrder.id,
                        table_no: 0,
                        status: 'Awaiting Settlement',
                        currentBill: total,
                        customer_name: currentOrder.customer_name,
                        customer_phone: currentOrder.customer_phone ?? undefined,
                        orders: [currentOrder],
                        latestStatus: currentOrder.status
                    });
                } else {
                    setSelectedTable(null);
                }
            } else {
                const currentSelected = enriched.find(t => t.id === selectedTable.id);
                if (currentSelected && currentSelected.status !== 'Empty') {
                    setSelectedTable(currentSelected);
                } else {
                    setSelectedTable(null);
                }
            }
        }

        setLoading(false);
        setRefreshing(false);
    }, [selectedTable, openingFloat, expenses, settings.gstRate, settings.isGstInclusive, settings.chargeServiceTax, settings.serviceChargeRate, attendanceStaffId, activeUser.id]);

    useEffect(() => {
        loadData();
        const ch = supabase.channel('cashier-petpooja-v4-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, loadData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, loadData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, loadData)
            .subscribe();
        return () => { supabase.removeChannel(ch); };
    }, [loadData]);

    const handleSelectTable = (t: TableView) => {
        if (t.status === 'Empty') return;
        setSelectedTable(t);
        setDiscountValue(0);
        setDiscountType('amt');
        setAppliedCoupon('');
        setIsSplitEnabled(false);
        setBillPrinted(false);
    };

    const getCheckoutCalculation = (t: TableView) => {
        const allItems: { name: string; qty: number; price: number; is_veg: boolean }[] = [];
        t.orders.forEach(o => {
            o.order_items.forEach(i => {
                const existing = allItems.find(x => x.name === (i.menu_items?.name ?? ''));
                if (existing) { existing.qty += i.qty; }
                else { allItems.push({ name: i.menu_items?.name ?? 'Item', qty: i.qty, price: i.price_at_order, is_veg: i.menu_items?.is_veg ?? false }); }
            });
        });

        const subtotal = allItems.reduce((s, i) => s + i.price * i.qty, 0);
        const discountAmt = discountType === 'amt' 
            ? Math.min(discountValue, subtotal)
            : Math.min((subtotal * discountValue) / 100, subtotal);
            
        const taxableAmount = subtotal - discountAmt;
        
        let cgst = 0, sgst = 0, service = 0, grand = 0;
        const splitRate = settings.gstRate / 2;

        if (settings.isGstInclusive) {
            const baseAmount = taxableAmount / (1 + (settings.gstRate / 100));
            const totalGst = taxableAmount - baseAmount;
            cgst = totalGst / 2;
            sgst = totalGst / 2;
            service = 0;
            grand = taxableAmount;
        } else {
            cgst = taxableAmount * (splitRate / 100);
            sgst = taxableAmount * (splitRate / 100);
            service = 0;
            grand = taxableAmount + cgst + sgst;
        }

        return { allItems, subtotal, discountAmt, taxableAmount, cgst, sgst, service, grand };
    };

    const handleApplyCoupon = (code: string) => {
        const coupon = PRESET_COUPONS.find(c => c.code === code);
        if (coupon) {
            setAppliedCoupon(code);
            setDiscountType(coupon.type as 'amt' | 'pct');
            setDiscountValue(coupon.value);
        } else {
            setAppliedCoupon('');
            setDiscountValue(0);
        }
    };

    const handlePrintBill = (t: TableView) => {
        const calc = getCheckoutCalculation(t);
        const token = t.orders?.[0]?.token_no;
        const w = window.open('', '_blank', 'width=380,height=600');
        if (!w) return;
        const now = new Date();
        w.document.write(`<!DOCTYPE html>
<html><head><title>Bill - T${t.table_no}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',monospace;width:${settings.printerSize === '58mm' ? '220px' : '300px'};padding:12px;font-size:11px;color:#000}
  h1{font-size:15px;text-align:center;font-weight:950;letter-spacing:1px}
  .center{text-align:center}.sub{font-size:9px;color:#333}
  .sep{border-top:1px dashed #000;margin:6px 0}
  .row{display:flex;justify-content:space-between;margin:2px 0}
  .bold{font-weight:700}.big{font-size:14px;font-weight:900}
</style></head>
<body>
<h1>${settings.headerNote}</h1>
<p class="center sub">Hotel Taj Ooty</p>
<div class="sep"></div>
<div class="row"><span>${token ? `Token No: <b>${token}</b>` : `Table: <b>T-${t.table_no}</b>`}</span><span>${now.toLocaleDateString()}</span></div>
<div class="row"><span>Guest: ${t.customer_name ?? 'Guest'}</span><span>${now.toLocaleTimeString()}</span></div>
<div class="sep"></div>
<div class="row bold"><span>Item</span><span>Qty × Rate</span><span>Amt</span></div>
<div class="sep"></div>
${calc.allItems.map(i => `<div class="row"><span>${i.name}</span><span>${i.qty}×${i.price}</span><span>₹${(i.qty * i.price).toFixed(0)}</span></div>`).join('')}
<div class="sep"></div>
<div class="row"><span>Subtotal</span><span>₹${calc.subtotal.toFixed(0)}</span></div>
${calc.discountAmt > 0 ? `<div class="row"><span>Discount</span><span>-₹${calc.discountAmt.toFixed(0)}</span></div>` : ''}
<div class="row"><span>CGST (${(settings.gstRate / 2)}%)</span><span>₹${calc.cgst.toFixed(0)}</span></div>
<div class="row"><span>SGST (${(settings.gstRate / 2)}%)</span><span>₹${calc.sgst.toFixed(0)}</span></div>
<div class="sep"></div>
<div class="row big"><span>GRAND TOTAL</span><span>₹${calc.grand.toFixed(0)}</span></div>
<div class="sep"></div>
<p class="center bold">${settings.footerNote}</p>
<script>window.onload=()=>{window.print();window.close();}</script>
</body></html>`);
        w.document.close();
        setBillPrinted(true);
    };

    const handleSettlePayment = async (t: TableView) => {
        if (!canSettleBills) {
            triggerPermissionDenied('generate_bills');
            return;
        }
        setSubmittingPayment(true);
        try {
            if (settings.autoPrint) {
                handlePrintBill(t);
            }
            for (const o of t.orders) {
                await advanceOrderStatus(o.id, 'billed');
            }
            setSelectedTable(null);
            loadData();
        } catch (e) {
            console.error('Failed to settle payment', e);
        } finally {
            setSubmittingPayment(false);
        }
    };

    const handleToggleItemStock = async (itemId: string, currentVal: boolean) => {
        if (!hasPerm('view_menu') && !hasPerm('manage_inventory')) {
            triggerPermissionDenied('view_menu');
            return;
        }
        const { error } = await supabase.from('menu_items').update({ is_available: !currentVal }).eq('id', itemId);
        if (error) {
            alert('Failed to update availability');
        } else {
            loadData();
        }
    };

    const handleUpdateMenuStock = async (itemId: string, isAvailable: boolean, qty: number | null) => {
        if (!hasPerm('view_menu') && !hasPerm('manage_inventory')) {
            triggerPermissionDenied('view_menu');
            return;
        }
        const { error } = await supabase.from('menu_items').update({ is_available: isAvailable, stock_qty: qty }).eq('id', itemId);
        if (error) {
            alert('Failed to update stock');
        } else {
            loadData();
        }
    };

    const handleStaffAttendance = async (action: 'clock_in' | 'clock_out') => {
        if (!hasPerm('manage_staff')) {
            triggerPermissionDenied('manage_staff');
            return;
        }
        if (!attendanceStaffId) return;

        if (action === 'clock_in') {
            const { error } = await supabase.from('staff_attendance').insert({
                staff_id: attendanceStaffId,
                status: 'active'
            });
            if (error) {
                alert('Clock-in failed: ' + error.message);
            } else {
                loadData();
            }
        } else {
            const activeLog = attendanceLogs.find(a => a.staff_id === attendanceStaffId && a.clock_out === null);
            if (!activeLog) {
                alert('No active clock-in session found for this staff member.');
                return;
            }
            const { error } = await supabase.from('staff_attendance').update({
                clock_out: new Date().toISOString(),
                status: 'completed'
            }).eq('id', activeLog.id);
            
            if (error) {
                alert('Clock-out failed: ' + error.message);
            } else {
                loadData();
            }
        }
    };

    const triggerPermissionDenied = (permKey: string) => {
        setDeniedPermission(permKey);
        setTimeout(() => setDeniedPermission(null), 4500);
    };

    const handleSidebarAction = (actionId: string, permKey: string) => {
        if (!hasPerm(permKey)) {
            triggerPermissionDenied(permKey);
            return;
        }
        setIsSidebarOpen(false);
        if (['bento', 'tables', 'takeaway', 'history', 'reports', 'online_orders', 'stock_inventory'].includes(actionId)) {
            setView(actionId as MainView);
        } else {
            setActiveOpModal(actionId);
        }
    };

    const handleAddExpense = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newExpensePurpose || newExpenseAmount <= 0) return;
        const entry: PettyCashEntry = {
            id: Math.random().toString(36).substring(2, 9),
            purpose: newExpensePurpose,
            amount: newExpenseAmount,
            created_at: new Date().toISOString()
        };
        setExpenses(prev => [entry, ...prev]);
        setNewExpensePurpose('');
        setNewExpenseAmount(0);
        setActiveOpModal(null);
    };

    const handleCloseSession = () => {
        const closingLog = {
            closed_at: new Date().toLocaleTimeString(),
            expected: expectedCash,
            actual: actualClosingCash,
            variance: actualClosingCash - expectedCash
        };
        setRegisterLogs(prev => [closingLog, ...prev]);
        setIsRegisterOpen(false);
        setActiveOpModal(null);
    };

    const toggleAggregator = async (aggregator: 'swiggy' | 'zomato') => {
        if (!restaurantSettings) return;
        const key = `${aggregator}_enabled`;
        const updatedVal = !restaurantSettings[key];
        
        // Optimistic local state update
        const updated = {
            ...restaurantSettings,
            [key]: updatedVal
        };
        setRestaurantSettings(updated);

        // Persistent update in database
        const { error } = await supabase
            .from('restaurant_settings')
            .update({ [key]: updatedVal })
            .eq('id', restaurantSettings.id);

        if (error) {
            alert(`Failed to toggle ${aggregator} setting: ${error.message}`);
            // Rollback optimistic state
            setRestaurantSettings(restaurantSettings);
        }
    };

    return {
        view, setView, tables, setTables, activeOrders, history, menuItemsList,
        guests, staffList, attendanceLogs, loading, refreshing, setRefreshing,
        selectedTable, setSelectedTable, discountType, setDiscountType,
        discountValue, setDiscountValue, appliedCoupon, setAppliedCoupon,
        paymentMethod, setPaymentMethod, submittingPayment, billPrinted, setBillPrinted,
        isSplitEnabled, setIsSplitEnabled, splitGuests, setSplitGuests,
        dayStats, isRegisterOpen, setIsRegisterOpen, openingFloat, setOpeningFloat,
        expectedCash, actualClosingCash, setActualClosingCash, registerLogs,
        expenses, newExpensePurpose, setNewExpensePurpose, newExpenseAmount, setNewExpenseAmount,
        takeawayOrders, onlineOrders, restaurantSettings, toggleAggregator, isSidebarOpen, setIsSidebarOpen, isSettingsOpen, setIsSettingsOpen,
        settings, setSettings, activeOpModal, setActiveOpModal, deniedPermission, setDeniedPermission,
        selectedReport, setSelectedReport, attendanceStaffId, setAttendanceStaffId, rolesList,
        hasPerm, canApplyDiscount, canSettleBills, loadData, handleSelectTable,
        getCheckoutCalculation, handleApplyCoupon, handlePrintBill, handleSettlePayment,
        handleToggleItemStock, handleStaffAttendance, handleUpdateMenuStock, triggerPermissionDenied,
        handleSidebarAction, handleAddExpense, handleCloseSession
    };
}
