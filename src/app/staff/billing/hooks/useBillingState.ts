"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/features/ordering/lib/supabase';
import { orderTotal } from '../components/utils';
import {
    settleBillWithPayment, settleBillWithSplitPayment, openRegisterSession, closeRegisterSession,
    getActiveRegisterSession, addPettyExpense, getSessionExpenses, getTodayPaymentBreakdown, transferTableOrder, fetchBillingDashboardData
} from '@/features/ordering/actions/billingActions';
import { getDashboardPreferences } from '@/features/ordering/actions/dashboardPrefActions';
import { normalizeStaffRole } from '@/features/ordering/config/widgetCatalog';
import { validateAndApplyCoupon } from '@/features/ordering/actions/couponActions';
import {
    TableView, CashierOrder, GuestRecord, StaffUser, AttendanceLog,
    MainView, PayMethod, DayStats, PettyCashEntry, ActiveStaffUser
} from '../types';
import { printThermalReceipt } from '@/features/ordering/lib/thermalPrint';
import { buildReceiptCommands } from '@/features/ordering/lib/escpos';
import {
    getLoyaltyBalance, earnLoyaltyPoints, redeemLoyaltyPoints, CustomerLoyaltyData
} from '@/features/ordering/actions/loyaltyActions';
import { toast } from '@/features/ordering/lib/toast';

export function useBillingState(activeUser: ActiveStaffUser) {
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

    // Dynamic Permission & Role state overrides
    const [currentPermissions, setCurrentPermissions] = useState<string[]>(activeUser.permissions || []);
    const [currentRoleName, setCurrentRoleName] = useState<string>(activeUser.roleName || 'Cashier');

    // Sidebar selected table
    const [selectedTable, setSelectedTable] = useState<TableView | null>(null);

    // Discount state
    const [discountType, setDiscountType] = useState<'amt' | 'pct'>('amt');
    const [discountValue, setDiscountValue] = useState<number>(0);
    const [appliedCoupon, setAppliedCoupon] = useState<string>('');

    // Payment state
    const [paymentMethod, setPaymentMethod] = useState<PayMethod>('cash');
    const [submittingPayment, setSubmittingPayment] = useState(false);
    const [billPrinted, setBillPrinted] = useState(false);

    // Split Billing State
    const [isSplitEnabled, setIsSplitEnabled] = useState(false);
    const [splitGuests, setSplitGuests] = useState(2);

    // Multi-Tender Payment Breakdown State
    const [isMultiTenderEnabled, setIsMultiTenderEnabled] = useState(false);
    const [multiTenderRows, setMultiTenderRows] = useState<{ method: 'cash' | 'card' | 'upi'; amount: number }[]>([
        { method: 'cash', amount: 0 },
        { method: 'upi', amount: 0 }
    ]);

    // Loyalty Program State
    const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
    const [customerLoyalty, setCustomerLoyalty] = useState<CustomerLoyaltyData | null>(null);
    const [loyaltyToast, setLoyaltyToast] = useState<string | null>(null);

    const fetchLoyaltyInfo = async (phone: string) => {
        if (!phone || phone.trim().length < 6) {
            setCustomerLoyalty(null);
            return;
        }
        const res = await getLoyaltyBalance(phone);
        if (res.success && res.loyalty) {
            setCustomerLoyalty(res.loyalty);
        } else {
            setCustomerLoyalty(null);
        }
    };

    // Day stats & registers
    const [dayStats, setDayStats] = useState<DayStats>({
        revenue: 0, bills: 0, avgBill: 0, activeTables: 0,
        cashSales: 0, cardSales: 0, upiSales: 0
    });

    // Cash Register Session — persisted to DB
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);
    const [registerSessionId, setRegisterSessionId] = useState<string | null>(null);
    const [openingFloat, setOpeningFloat] = useState(0);
    const [expectedCash, setExpectedCash] = useState(0);
    const [actualClosingCash, setActualClosingCash] = useState(0);
    const [registerLogs, setRegisterLogs] = useState<any[]>([]);

    // Petty Cash Expenses — persisted to DB
    const [expenses, setExpenses] = useState<PettyCashEntry[]>([]);
    const [newExpensePurpose, setNewExpensePurpose] = useState('');
    const [newExpenseAmount, setNewExpenseAmount] = useState<number>(0);

    // Aggregators & drawers
    const [takeawayOrders, setTakeawayOrders] = useState<CashierOrder[]>([]);
    const [onlineOrders, setOnlineOrders] = useState<CashierOrder[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [restaurantSettings, setRestaurantSettings] = useState<any>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const [settings, setSettings] = useState({
        printerSize: '80mm',
        autoPrint: false,
        gstRate: 5,
        serviceChargeRate: 0,
        headerNote: 'HOTEL TAJ OOTY',
        footerNote: 'Thank you! Visit again.',
        isGstInclusive: false,
        chargeServiceTax: false,
    });

    const [activeOpModal, setActiveOpModal] = useState<string | null>(null);
    const [deniedPermission, setDeniedPermission] = useState<string | null>(null);
    const [selectedReport, setSelectedReport] = useState<string>('Sales Summary');
    const [attendanceStaffId, setAttendanceStaffId] = useState<string>('');
    const [rolesList, setRolesList] = useState<any[]>([]);
    const [customerGstin, setCustomerGstin] = useState<string>('');

    // Dashboard Personalization widgets
    const [userVisibleWidgets, setUserVisibleWidgets] = useState<string[]>([]);
    const [userWidgetOrder, setUserWidgetOrder] = useState<string[]>([]);
    const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
    const [isPrinterModalOpen, setIsPrinterModalOpen] = useState(false);

    // Helper: check permission dynamically against current permissions state
    const hasPerm = (permKey: string) => currentPermissions.includes(permKey);
    const canApplyDiscount = hasPerm('apply_discount');
    const canSettleBills = hasPerm('generate_bills');

    // ─── Orders, Tables & Menu fetch ──────────────────────────────────────────
    const loadData = useCallback(async () => {
        setRefreshing(true);

        const bldRes = await fetchBillingDashboardData();
        let rawTables: any[] = [];
        let rawOrders: any[] = [];
        let rawHistory: any[] = [];
        let rawMenu: any[] = [];
        let rawStaff: any[] = [];
        let rawAttendance: any[] = [];
        let rawSettings: any = null;
        let rawRoles: any[] = [];

        if (bldRes.success) {
            rawTables = bldRes.tables ?? [];
            rawOrders = bldRes.activeOrders ?? [];
            rawHistory = bldRes.historyOrders ?? [];
            rawMenu = bldRes.menuItems ?? [];
            rawStaff = bldRes.staff ?? [];
            rawAttendance = bldRes.attendance ?? [];
            rawSettings = bldRes.settings ?? null;
            rawRoles = bldRes.roles ?? [];
        } else {
            const [
                { data: t },
                { data: a },
                { data: h },
                { data: m },
                { data: s },
                { data: att },
                { data: set },
                { data: r }
            ] = await Promise.all([
                supabase.from('restaurant_tables').select('*').order('table_no'),
                supabase.from('orders').select(`
                    id, status, created_at, customer_name, customer_phone, table_id, source, token_no,
                    restaurant_tables:restaurant_tables!orders_table_id_fkey(table_no, id),
                    order_items:order_items!order_items_order_id_fkey(id, qty, price_at_order, notes, discount_percent, discount_reason, menu_items:menu_items!order_items_menu_item_id_fkey(id, name, is_veg))
                `).in('status', ['confirmed', 'preparing', 'ready', 'served', 'on_hold']).order('created_at', { ascending: false }),
                supabase.from('orders').select(`
                    id, status, created_at, customer_name, customer_phone, table_id, source, token_no,
                    restaurant_tables:restaurant_tables!orders_table_id_fkey(table_no, id),
                    order_items:order_items!order_items_order_id_fkey(id, qty, price_at_order, notes, discount_percent, discount_reason, menu_items:menu_items!order_items_menu_item_id_fkey(id, name, is_veg))
                `).in('status', ['billed', 'cancelled']).order('created_at', { ascending: false }).limit(200),
                supabase.from('menu_items').select('*, categories:categories!menu_items_category_id_fkey(name)').order('name'),
                supabase.from('staff_users').select('*, roles:roles!staff_users_role_id_fkey(name)').order('name'),
                supabase.from('staff_attendance').select('*, staff_users(name)').order('clock_in', { ascending: false }).limit(100),
                supabase.from('restaurant_settings').select('*').limit(1).single(),
                supabase.from('roles').select('*, role_permissions:role_permissions!role_permissions_role_id_fkey(permissions:permissions!role_permissions_permission_id_fkey(key))')
            ]);
            rawTables = t ?? [];
            rawOrders = a ?? [];
            rawHistory = h ?? [];
            rawMenu = m ?? [];
            rawStaff = s ?? [];
            rawAttendance = att ?? [];
            rawSettings = set;
            rawRoles = r ?? [];
        }

        if (rawRoles) {
            setRolesList(rawRoles);
            const myUser = rawStaff?.find((u: any) => u.id === activeUser.id || u.auth_id === activeUser.id);
            if (myUser && myUser.roles?.name) {
                setCurrentRoleName(myUser.roles.name);
                const myRoleObj = rawRoles.find((r: any) => r.id === myUser.role_id);
                if (myRoleObj && myRoleObj.role_permissions) {
                    const freshKeys = myRoleObj.role_permissions
                        .map((rp: any) => rp.permissions?.key)
                        .filter(Boolean);
                    setCurrentPermissions(freshKeys);
                }
            }
        }

        if (rawSettings) {
            setRestaurantSettings(rawSettings);
            setSettings(prev => ({
                ...prev,
                // These columns are now in DB via migration 034
                gstRate: rawSettings.gst_rate ?? 5,
                serviceChargeRate: rawSettings.service_charge_rate ?? 0,
                isGstInclusive: rawSettings.is_gst_inclusive ?? false,
                chargeServiceTax: rawSettings.charge_service_tax ?? false,
                headerNote: rawSettings.restaurant_name ?? 'HOTEL TAJ OOTY',
                footerNote: rawSettings.footer_note ?? 'Thank you! Visit again.',
            }));
        }

        if (rawMenu) setMenuItemsList(rawMenu as any[]);
        if (rawStaff) setStaffList(rawStaff as any[]);

        if (rawAttendance) {
            const mappedLog: AttendanceLog[] = (rawAttendance as any[]).map(a => ({
                id: a.id,
                staff_id: a.staff_id,
                clock_in: a.clock_in,
                clock_out: a.clock_out,
                staff_name: a.staff_users?.name || 'Staff'
            }));
            setAttendanceLogs(mappedLog);
            if (!attendanceStaffId && rawStaff && rawStaff.length > 0) {
                setAttendanceStaffId(rawStaff[0].id);
            }
        }

        if (rawOrders) {
            setActiveOrders(rawOrders as any[]);
            const takeaways = (rawOrders as unknown as CashierOrder[]).filter(o => o.source === 'takeaway' || (!o.table_id && o.source !== 'swiggy' && o.source !== 'zomato'));
            const onlines = (rawOrders as unknown as CashierOrder[]).filter(o => o.source === 'swiggy' || o.source === 'zomato');
            setTakeawayOrders(takeaways);
            setOnlineOrders(onlines);
        }

        const enriched: TableView[] = (rawTables || []).map(t => {
            const tOrders = (rawOrders || []).filter(o => o.table_id === t.id) as unknown as CashierOrder[];
            const bill = tOrders.reduce((s, o) => s + orderTotal(o), 0);

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
        const todayBills = (rawHistory || []).filter(o => {
            const d = new Date(o.created_at);
            return d.toDateString() === today.toDateString();
        });

        const guestMap = new Map<string, { name: string; phone: string; totalVisits: number; totalSpent: number; lastVisit: string }>();
        const aggregateOrders = [...(rawOrders || []), ...(rawHistory || [])];
        aggregateOrders.forEach(o => {
            if (o.customer_phone) {
                const existing = guestMap.get(o.customer_phone);
                // Use actual item subtotal — no fake multiplier
                const sub = (o.order_items || []).reduce((s: number, i: any) => s + i.price_at_order * i.qty, 0);
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
            const sub = orderTotal(o as unknown as CashierOrder);
            if (settings.isGstInclusive) {
                const service = settings.chargeServiceTax ? (sub / (1 + (settings.gstRate / 100))) * (settings.serviceChargeRate / 100) : 0;
                return s + sub + service;
            } else {
                const gst = sub * (settings.gstRate / 100);
                const service = settings.chargeServiceTax ? sub * (settings.serviceChargeRate / 100) : 0;
                return s + sub + gst + service;
            }
        }, 0);

        setTables(enriched);
        setActiveOrders(rawOrders as any[]);
        setHistory(rawHistory as any[]);
        setDayStats(prev => ({
            revenue: rev, bills: todayBills.length,
            avgBill: todayBills.length ? rev / todayBills.length : 0,
            activeTables: enriched.filter(t => t.status !== 'Empty').length,
            cashSales: prev.cashSales, cardSales: prev.cardSales, upiSales: prev.upiSales
        }));

        if (selectedTable) {
            if (selectedTable.table_no === 0) {
                const currentOrder = (rawOrders || []).find(o => o.id === selectedTable.id);
                if (currentOrder) {
                    const total = orderTotal(currentOrder as any);
                    setSelectedTable({
                        id: currentOrder.id,
                        table_no: 0,
                        status: 'Awaiting Settlement',
                        currentBill: total,
                        customer_name: currentOrder.customer_name,
                        customer_phone: currentOrder.customer_phone ?? undefined,
                        orders: [currentOrder as any],
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

    const loadShiftData = useCallback(async () => {
        const [payBreakdown, { session }] = await Promise.all([
            getTodayPaymentBreakdown(),
            getActiveRegisterSession()
        ]);

        setDayStats(prev => ({
            ...prev,
            cashSales: payBreakdown.cash,
            cardSales: payBreakdown.card,
            upiSales: payBreakdown.upi
        }));

        if (session) {
            setIsRegisterOpen(true);
            setRegisterSessionId(session.id);
            setOpeningFloat(session.opening_float ?? 0);
            const { expenses: dbExpenses } = await getSessionExpenses(session.id);
            const mapped: PettyCashEntry[] = (dbExpenses as any[]).map((e: any) => ({
                id: e.id,
                purpose: e.description,
                amount: e.amount,
                created_at: e.created_at
            }));
            setExpenses(mapped);
            const expenseTotal = mapped.reduce((s, e) => s + e.amount, 0);
            setExpectedCash((session.opening_float ?? 0) + payBreakdown.cash - expenseTotal);
        } else {
            setIsRegisterOpen(false);
            setRegisterSessionId(null);
            setExpenses([]);
            setExpectedCash(payBreakdown.cash);
        }
    }, []);

    const loadDataRef = useRef(loadData);
    useEffect(() => {
        loadDataRef.current = loadData;
    }, [loadData]);

    useEffect(() => {
        loadDataRef.current();
        loadShiftData();

        // 10-second background fallback interval (WebSockets handle instant 0ms updates)
        const interval = setInterval(() => {
            loadDataRef.current();
        }, 10000);

        const ch = supabase.channel('cashier-petpooja-v4-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadDataRef.current())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => loadDataRef.current())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => loadDataRef.current())
            .subscribe();

        return () => {
            clearInterval(interval);
            supabase.removeChannel(ch);
        };
    }, [loadShiftData]);

    useEffect(() => {
        let cancelled = false;
        const role = normalizeStaffRole(currentRoleName);

        getDashboardPreferences(role).then(res => {
            if (cancelled || !res.success) return;
            setUserVisibleWidgets(res.preferences.visible);
            setUserWidgetOrder(res.preferences.order);
        });

        return () => { cancelled = true; };
    }, [currentRoleName]);

    const handleSelectTable = (t: TableView) => {
        if (t.status === 'Empty') return;
        setSelectedTable(t);
        setDiscountValue(0);
        setDiscountType('amt');
        setAppliedCoupon('');
        setIsSplitEnabled(false);
        setBillPrinted(false);
        setPointsToRedeem(0);
        const phone = t.customer_phone || t.orders?.[0]?.customer_phone;
        if (phone) fetchLoyaltyInfo(phone);
        else setCustomerLoyalty(null);
    };

    const getCheckoutCalculation = (t: TableView) => {
        const allItems: { id?: string; name: string; qty: number; price: number; is_veg: boolean; discount_percent?: number | null; discount_reason?: string | null; effectivePrice: number }[] = [];
        t.orders.forEach(o => {
            o.order_items.forEach(i => {
                const disc = (i.discount_percent && Number(i.discount_percent) > 0) ? Number(i.discount_percent) : 0;
                const effPrice = i.price_at_order * (1 - disc / 100);
                allItems.push({
                    id: i.id,
                    name: i.menu_items?.name ?? 'Item',
                    qty: i.qty,
                    price: i.price_at_order,
                    is_veg: i.menu_items?.is_veg ?? false,
                    discount_percent: i.discount_percent,
                    discount_reason: i.discount_reason,
                    effectivePrice: effPrice
                });
            });
        });

        const subtotal = allItems.reduce((s, i) => s + i.effectivePrice * i.qty, 0);
        const promoDiscount = discountType === 'amt'
            ? Math.min(discountValue, subtotal)
            : Math.min((subtotal * discountValue) / 100, subtotal);

        const redemptionRate = Number(restaurantSettings?.loyalty_redemption_rate) || 0.5;
        const loyaltyDiscount = Math.min(pointsToRedeem * redemptionRate, Math.max(0, subtotal - promoDiscount));
        const discountAmt = promoDiscount + loyaltyDiscount;

        const taxableAmount = subtotal - discountAmt;
        const serviceChargeRate = settings.chargeServiceTax
            ? (settings.serviceChargeRate ?? 0) / 100
            : 0;
        const service = taxableAmount * serviceChargeRate;
        const gstBase = taxableAmount + service;

        let cgst = 0, sgst = 0, grand = 0;
        const gstRate = (settings.gstRate ?? 5) / 100;

        if (settings.isGstInclusive) {
            grand = gstBase;
            const baseBeforeGst = gstBase / (1 + gstRate);
            const totalGst = gstBase - baseBeforeGst;
            cgst = totalGst / 2;
            sgst = totalGst / 2;
        } else {
            cgst = (gstBase * gstRate) / 2;
            sgst = (gstBase * gstRate) / 2;
            grand = gstBase + cgst + sgst;
        }

        return { allItems, subtotal, discountAmt, promoDiscount, loyaltyDiscount, taxableAmount, service, gstBase, cgst, sgst, grand };
    };

    const handleApplyCoupon = async (code: string) => {
        if (!code.trim()) {
            setAppliedCoupon('');
            setDiscountValue(0);
            return;
        }
        const res = await validateAndApplyCoupon(code);
        if (res.success && res.coupon) {
            setAppliedCoupon(res.coupon.code);
            setDiscountType(res.coupon.type);
            setDiscountValue(res.coupon.value);
        } else {
            toast.error(res.error || 'Invalid coupon');
            setAppliedCoupon('');
            setDiscountValue(0);
        }
    };

    const handlePrintBill = async (t: TableView) => {
        const calc = getCheckoutCalculation(t);
        const token = t.orders?.[0]?.token_no;
        const now = new Date();

        // Read restaurant details from DB settings (not hardcoded)
        const restaurantName = restaurantSettings?.restaurant_name || 'HOTEL TAJ OOTY';
        const restaurantAddress = restaurantSettings?.address || 'Main Bazaar Road, Ooty';
        const restaurantPhone = restaurantSettings?.phone || '+91 423 244 4000';

        const printerName = restaurantSettings?.printer_name;
        if (printerName) {
            const escCommands = buildReceiptCommands({
                restaurantName,
                address: restaurantAddress,
                phone: restaurantPhone,
                billNo: t.orders?.[0]?.id?.slice(-6).toUpperCase() || `B-${t.table_no}`,
                tableNo: `T-${t.table_no}`,
                customerName: t.customer_name ?? 'Guest',
                date: `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`,
                items: calc.allItems.map(i => ({
                    name: i.name,
                    qty: i.qty,
                    price: i.price,
                    amount: i.qty * i.effectivePrice
                })),
                subtotal: calc.subtotal,
                discount: calc.discountAmt,
                pointsRedeemed: pointsToRedeem,
                pointsDiscount: calc.loyaltyDiscount,
                taxableAmount: calc.taxableAmount,
                serviceCharge: calc.service,
                cgst: calc.cgst,
                sgst: calc.sgst,
                grandTotal: calc.grand,
                footerNote: settings.footerNote || restaurantSettings?.footer_note || 'Thank you! Visit again.'
            });

            const res = await printThermalReceipt(printerName, escCommands);
            if (res.success) {
                setBillPrinted(true);
                return;
            }
        }

        const w = window.open('', '_blank', 'width=380,height=600');
        if (!w) return;
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
  .disc-tag{font-size:9px;color:#444;font-style:italic}
</style></head>
<body>
<h1>${settings.headerNote}</h1>
<p class="center sub">Hotel Taj Ooty</p>
<div class="sep"></div>
<div class="row"><span>${token ? `Token No: <b>${token}</b>` : `Table: <b>T-${t.table_no}</b>`}</span><span>${now.toLocaleDateString()}</span></div>
<div class="row"><span>Guest: ${t.customer_name ?? 'Guest'}</span><span>${now.toLocaleTimeString()}</span></div>
${customerGstin ? `<div class="row"><span>GSTIN: ${customerGstin}</span></div>` : ''}
<div class="sep"></div>
<div class="row bold"><span>Item</span><span>Qty × Rate</span><span>Amt</span></div>
<div class="sep"></div>
${calc.allItems.map(i => {
            const hasDisc = i.discount_percent && Number(i.discount_percent) > 0;
            const origTotal = i.qty * i.price;
            const finalTotal = i.qty * i.effectivePrice;
            return `
    <div class="row">
      <span>${i.name}${hasDisc ? ` <br/><span class="disc-tag">(${i.discount_percent}% off - ${i.discount_reason || 'Comp'})</span>` : ''}</span>
      <span>${i.qty}×${i.price}</span>
      <span>${hasDisc ? `₹${origTotal.toFixed(0)} → ₹${finalTotal.toFixed(0)}` : `₹${origTotal.toFixed(0)}`}</span>
    </div>`;
        }).join('')}
<div class="sep"></div>
<div class="row"><span>Subtotal</span><span>₹${calc.subtotal.toFixed(2)}</span></div>
${calc.discountAmt > 0 ? `<div class="row"><span>Discount</span><span>-₹${calc.discountAmt.toFixed(2)}</span></div>` : ''}
${pointsToRedeem > 0 ? `<div class="row"><span>Points Redeemed (${pointsToRedeem} pts)</span><span>-₹${calc.loyaltyDiscount.toFixed(2)}</span></div>` : ''}
<div class="row"><span>Taxable Amount</span><span>₹${calc.taxableAmount.toFixed(2)}</span></div>
<div class="row"><span>CGST (${(settings.gstRate / 2)}%)</span><span>₹${calc.cgst.toFixed(2)}</span></div>
<div class="row"><span>SGST (${(settings.gstRate / 2)}%)</span><span>₹${calc.sgst.toFixed(2)}</span></div>
<div class="sep"></div>
<div class="row big"><span>GRAND TOTAL</span><span>₹${calc.grand.toFixed(2)}</span></div>
<div class="sep"></div>
<p class="center bold">${settings.footerNote}</p>
<script>window.onload=()=>{window.print();window.close();}</script>
</body></html>`);
        w.document.close();
        setBillPrinted(true);
    };

    const handleSettlePayment = async (t: TableView) => {
        setSubmittingPayment(true);
        try {
            // Auto-open register shift if register is closed
            if (!isRegisterOpen) {
                const regRes = await openRegisterSession(0);
                if (regRes.success && regRes.session) {
                    setIsRegisterOpen(true);
                    setRegisterSessionId(regRes.session.id);
                }
            }

            if (settings.autoPrint) {
                handlePrintBill(t);
            }
            const calc = getCheckoutCalculation(t);
            const orderIds = t.orders.map(o => o.id);

            let result;
            if (isMultiTenderEnabled && multiTenderRows.length > 0) {
                result = await settleBillWithSplitPayment(orderIds, calc.grand, multiTenderRows);
            } else {
                result = await settleBillWithPayment(orderIds, calc.grand, paymentMethod);
            }

            if (!result.success) {
                toast.error(`Settlement failed: ${result.error}`);
                return;
            }

            // Process Loyalty Points Earn & Redeem
            const customerPhone = t.customer_phone || t.orders?.[0]?.customer_phone;
            const customerName = t.customer_name || t.orders?.[0]?.customer_name || 'Guest';

            if (customerPhone) {
                const billId = (result as any)?.billId;
                if (pointsToRedeem > 0) {
                    await redeemLoyaltyPoints(customerPhone, pointsToRedeem, billId);
                }
                const earnRes = await earnLoyaltyPoints(customerPhone, customerName, calc.grand, billId);
                if (earnRes.success && earnRes.pointsEarned > 0) {
                    setLoyaltyToast(`+${earnRes.pointsEarned} points earned! New balance: ${earnRes.newBalance} points`);
                    setTimeout(() => setLoyaltyToast(null), 5000);
                }
            }

            setPointsToRedeem(0);
            setSelectedTable(null);
            loadData();
            loadShiftData();
        } catch (e) {
            // Surface the error to the user rather than silently swallowing it
            toast.error(`Payment settlement error: ${e instanceof Error ? e.message : String(e)}`);
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
            toast.error('Failed to update availability');
        } else {
            loadData();
        }
    };

    const handleUpdateMenuStock = async (itemId: string, isAvailable: boolean, stockQty?: number | null) => {
        const payload: any = { is_available: isAvailable };
        if (stockQty !== undefined) payload.stock_qty = stockQty;
        const { error } = await supabase.from('menu_items').update(payload).eq('id', itemId);
        if (!error) loadData();
    };

    const handleStaffAttendance = async (action: 'clock_in' | 'clock_out') => {
        if (!attendanceStaffId) {
            toast.warning('Select a staff member');
            return;
        }
        const now = new Date().toISOString();
        if (action === 'clock_in') {
            const { error } = await supabase.from('staff_attendance').insert({ staff_id: attendanceStaffId, clock_in: now });
            if (error) toast.error('Failed to clock in: ' + error.message);
            else {
                toast.success('Clocked in successfully!');
                loadData();
            }
        } else {
            const { data: openLogs } = await supabase.from('staff_attendance')
                .select('*')
                .eq('staff_id', attendanceStaffId)
                .is('clock_out', null)
                .order('clock_in', { ascending: false })
                .limit(1);
            if (openLogs && openLogs.length > 0) {
                const { error } = await supabase.from('staff_attendance')
                    .update({ clock_out: now })
                    .eq('id', openLogs[0].id);
                if (error) toast.error('Failed to clock out: ' + error.message);
                else {
                    toast.success('Clocked out successfully!');
                    loadData();
                }
            } else {
                toast.warning('No active clock-in found for this staff member');
            }
        }
    };

    const triggerPermissionDenied = (permKey: string) => {
        setDeniedPermission(permKey);
        setTimeout(() => setDeniedPermission(null), 4000);
    };

    const handleSidebarAction = (actionId: string, permKey: string) => {
        setIsSidebarOpen(false);
        const lowerId = (actionId || '').toLowerCase();
        if (lowerId.includes('dashboard') || lowerId === 'bento') setView('bento');
        else if (lowerId.includes('floor') || lowerId === 'tables') setView('tables');
        else if (lowerId.includes('takeaway')) setView('takeaway');
        else if (lowerId.includes('online') || lowerId === 'online_orders') setView('online_orders');
        else if (lowerId.includes('kitchen') || lowerId === 'kitchen_tickets') setView('kitchen_tickets');
        else if (lowerId.includes('stock') || lowerId === 'stock_inventory') setView('stock_inventory');
        else if (lowerId.includes('staff') || lowerId === 'staff_roster') setView('staff_roster');
        else if (lowerId.includes('invoice') || lowerId.includes('history') || lowerId === 'history') setView('history');
        else if (lowerId.includes('report') || lowerId === 'reports') setView('reports');
        else if (lowerId.includes('crm') || lowerId.includes('guest') || lowerId === 'crm_customers') setView('crm_customers');
        else if (lowerId.includes('table') || lowerId === 'table_config') setView('table_config');
        else if (lowerId.includes('gst') || lowerId === 'gst_settings') setView('gst_settings');
        else if (lowerId.includes('drawer') || actionId === 'Drawer Session') setActiveOpModal('drawer_session');
        else if (lowerId.includes('petty') || actionId === 'Petty Expenses') setActiveOpModal('petty_expenses');
        else if (lowerId.includes('export') || actionId === 'Export') setActiveOpModal('export');
    };

    const handleOpenSession = async (floatAmount: number) => {
        const res = await openRegisterSession(floatAmount);
        if (res.success && res.session) {
            setIsRegisterOpen(true);
            setRegisterSessionId(res.session.id);
            setOpeningFloat(Number(res.session.opening_float) || 0);
            loadShiftData();
        } else {
            toast.error(res.error || 'Failed to open register session');
        }
    };

    const handleCloseSession = async (closingCash: number) => {
        if (!registerSessionId) return;
        const res = await closeRegisterSession(registerSessionId, closingCash);
        if (res.success) {
            setIsRegisterOpen(false);
            setRegisterSessionId(null);
            setActualClosingCash(closingCash);
            toast.success('Register session closed successfully!');
            loadShiftData();
        } else {
            toast.error(res.error || 'Failed to close session');
        }
    };

    const handleAddExpense = async (desc: string, amt: number) => {
        if (!registerSessionId) {
            toast.warning('Cash register session must be open to log petty expenses');
            return;
        }
        const res = await addPettyExpense(registerSessionId, desc, amt);
        if (res.success) {
            setNewExpensePurpose('');
            setNewExpenseAmount(0);
            loadShiftData();
        } else {
            toast.error(res.error || 'Failed to record expense');
        }
    };

    const handleTransferTable = async (fromTableId: string, toTableId: string) => {
        const res = await transferTableOrder(fromTableId, toTableId);
        if (!res.success) {
            toast.error(res.error || 'Failed to transfer table');
        } else {
            setSelectedTable(null);
            await loadData();
        }
    };

    const handlePrintKOT = (order: CashierOrder) => {
        const w = window.open('', '_blank', 'width=380,height=500');
        if (!w) return;
        const now = new Date(order.created_at);
        w.document.write(`<!DOCTYPE html>
<html><head><title>KOT #${order.token_no || order.id.slice(0, 6)}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',monospace;width:280px;padding:10px;font-size:11px;color:#000}
  h1{font-size:16px;text-align:center;font-weight:900}
  .center{text-align:center}
  .sep{border-top:2px solid #000;margin:6px 0}
  .dashed{border-top:1px dashed #000;margin:4px 0}
  .row{display:flex;justify-content:space-between;margin:3px 0}
  .bold{font-weight:700}
  .item-row{font-size:13px;font-weight:800;margin:4px 0}
  .note{font-size:10px;font-style:italic;color:#333;margin-left:8px}
</style></head>
<body>
<h1>*** KITCHEN ORDER TICKET ***</h1>
<p class="center bold">Hotel Taj Ooty</p>
<div class="sep"></div>
<div class="row bold"><span>${order.restaurant_tables ? `TABLE: T-${order.restaurant_tables.table_no}` : `PICKUP #${order.token_no || order.id.slice(0,4)}`}</span><span>${now.toLocaleTimeString()}</span></div>
<div class="row"><span>Guest: ${order.customer_name || 'Walk-in'}</span><span>${now.toLocaleDateString()}</span></div>
<div class="sep"></div>
<div class="row bold"><span>QTY & ITEM</span><span>STATUS</span></div>
<div class="dashed"></div>
${(order.order_items || []).map((i: any) => `
<div class="item-row flex justify-between">
  <span>${i.qty} × ${i.menu_items?.name || 'Item'}</span>
</div>
${i.notes ? `<div class="note">Note: ${i.notes}</div>` : ''}
`).join('')}
<div class="sep"></div>
<p class="center bold">Printed by Cashier Desk</p>
<script>window.onload=()=>{window.print();window.close();}</script>
</body></html>`);
        w.document.close();
    };

    const toggleAggregator = async (aggregator: 'swiggy' | 'zomato') => {
        if (!restaurantSettings) return;
        // DB columns are swiggy_enabled / zomato_enabled (migration 014)
        const field = aggregator === 'swiggy' ? 'swiggy_enabled' : 'zomato_enabled';
        const val = !restaurantSettings[field];
        const { error } = await supabase
            .from('restaurant_settings')
            .update({ [field]: val })
            .eq('id', restaurantSettings.id);
        if (!error) {
            setRestaurantSettings({ ...restaurantSettings, [field]: val });
        }
    };

    return {
        view, setView, tables, setTables, activeOrders, history, menuItemsList,
        guests, staffList, attendanceLogs, loading, refreshing, setRefreshing,
        selectedTable, setSelectedTable, discountType, setDiscountType,
        discountValue, setDiscountValue, appliedCoupon, setAppliedCoupon, currentRoleName,
        paymentMethod, setPaymentMethod, submittingPayment, billPrinted, setBillPrinted,
        isSplitEnabled, setIsSplitEnabled, splitGuests, setSplitGuests,
        isMultiTenderEnabled, setIsMultiTenderEnabled, multiTenderRows, setMultiTenderRows,
        pointsToRedeem, setPointsToRedeem, customerLoyalty, setCustomerLoyalty, loyaltyToast, setLoyaltyToast, fetchLoyaltyInfo,
        dayStats, isRegisterOpen, setIsRegisterOpen, openingFloat, setOpeningFloat, registerSessionId,
        expectedCash, actualClosingCash, setActualClosingCash, registerLogs,
        expenses, newExpensePurpose, setNewExpensePurpose, newExpenseAmount, setNewExpenseAmount,
        takeawayOrders, onlineOrders, restaurantSettings, setRestaurantSettings, toggleAggregator, isSidebarOpen, setIsSidebarOpen, isSettingsOpen, setIsSettingsOpen,
        settings, setSettings, activeOpModal, setActiveOpModal, deniedPermission, setDeniedPermission,
        selectedReport, setSelectedReport, attendanceStaffId, setAttendanceStaffId, rolesList,
        userVisibleWidgets, setUserVisibleWidgets, userWidgetOrder, setUserWidgetOrder, isCustomizeOpen, setIsCustomizeOpen,
        isPrinterModalOpen, setIsPrinterModalOpen, customerGstin, setCustomerGstin, searchQuery, setSearchQuery,
        hasPerm, canApplyDiscount, canSettleBills, loadData, loadShiftData, handleSelectTable,
        getCheckoutCalculation, handleApplyCoupon, handlePrintBill, handleSettlePayment,
        handleToggleItemStock, handleStaffAttendance, handleUpdateMenuStock, triggerPermissionDenied,
        handleSidebarAction, handleAddExpense, handleCloseSession, handleOpenSession,
        handleTransferTable, handlePrintKOT
    };
}
