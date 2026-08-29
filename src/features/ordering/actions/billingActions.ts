"use server";

import { getAuthUserId } from '../lib/supabaseServer';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { revalidatePath } from 'next/cache';

// ─── Auth helper ─────────────────────────────────────────────────────────────

async function requireCashierIdentity() {
    const userId = await getAuthUserId();
    if (!userId) return { error: 'Unauthorized' as const };

    const { data: staff, error } = await supabaseAdmin
        .from('staff_users')
        .select('id, role_id')
        .eq('auth_id', userId)
        .single();

    if (error || !staff) return { error: 'Staff profile not found' as const };
    return { staff };
}

// ─── FIX 1: Real bill settlement with payment_method ────────────────────────

export async function settleBillWithPayment(
    orderIds: string[],
    totalAmount: number,
    paymentMethod: 'cash' | 'card' | 'upi' | 'split'
) {
    const identity = await requireCashierIdentity();
    if ('error' in identity) return { success: false, error: identity.error };

    // Insert a single bill record for the table's combined orders
    const { error: billErr } = await supabaseAdmin
        .from('bills')
        .insert({
            order_id: orderIds[0], // Primary order reference
            total: totalAmount,
            payment_method: paymentMethod,
            cashier_id: identity.staff.id,
            paid_at: new Date().toISOString()
        });

    if (billErr) return { success: false, error: `Bill insert failed: ${billErr.message}` };

    // Mark all orders on the table as billed
    const { error: statusErr } = await supabaseAdmin
        .from('orders')
        .update({ status: 'billed' })
        .in('id', orderIds);

    if (statusErr) return { success: false, error: `Order status update failed: ${statusErr.message}` };

    // Log to order_status_history for each order
    await supabaseAdmin.from('order_status_history').insert(
        orderIds.map(id => ({
            order_id: id,
            status: 'billed',
            changed_by: identity.staff.id
        }))
    );

    // Activity log
    await supabaseAdmin.from('staff_activity_log').insert({
        staff_id: identity.staff.id,
        action: 'ORDER_BILLED',
        details: { order_ids: orderIds, total: totalAmount, payment_method: paymentMethod }
    });

    revalidatePath('/staff/billing');
    revalidatePath('/staff/orders');
    revalidatePath('/staff/admin');
    return { success: true };
}

export async function settleBillWithSplitPayment(
    orderIds: string[],
    totalAmount: number,
    payments: { method: 'cash' | 'card' | 'upi'; amount: number }[]
) {
    const identity = await requireCashierIdentity();
    if ('error' in identity) return { success: false, error: identity.error };

    if (!payments || payments.length === 0) {
        return { success: false, error: 'At least one payment method is required' };
    }

    const sumPayments = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    if (Math.abs(sumPayments - totalAmount) > 0.05) {
        return { success: false, error: `Payment sum (₹${sumPayments.toFixed(2)}) does not match bill total (₹${totalAmount.toFixed(2)})` };
    }

    const billPaymentMethod = payments.length > 1 ? 'split' : payments[0].method;

    const { data: billData, error: billErr } = await supabaseAdmin
        .from('bills')
        .insert({
            order_id: orderIds[0],
            total: totalAmount,
            payment_method: billPaymentMethod,
            cashier_id: identity.staff.id,
            paid_at: new Date().toISOString()
        })
        .select('id')
        .single();

    if (billErr || !billData) return { success: false, error: `Bill insert failed: ${billErr?.message || 'Unknown error'}` };

    const paymentRows = payments.map(p => ({
        bill_id: billData.id,
        payment_method: p.method,
        amount: p.amount
    }));

    const { error: splitErr } = await supabaseAdmin
        .from('bill_payments')
        .insert(paymentRows);

    if (splitErr) {
        return { success: false, error: `Payment breakdown insert failed: ${splitErr.message}` };
    }

    const { error: statusErr } = await supabaseAdmin
        .from('orders')
        .update({ status: 'billed' })
        .in('id', orderIds);

    if (statusErr) return { success: false, error: `Order status update failed: ${statusErr.message}` };

    await supabaseAdmin.from('order_status_history').insert(
        orderIds.map(id => ({
            order_id: id,
            status: 'billed',
            changed_by: identity.staff.id
        }))
    );

    await supabaseAdmin.from('staff_activity_log').insert({
        staff_id: identity.staff.id,
        action: 'ORDER_BILLED_SPLIT',
        details: { order_ids: orderIds, total: totalAmount, payments }
    });

    revalidatePath('/staff/billing');
    revalidatePath('/staff/orders');
    revalidatePath('/staff/admin');
    return { success: true };
}

// ─── FIX 2: Cash register session management ────────────────────────────────

export async function openRegisterSession(openingFloat: number) {
    const identity = await requireCashierIdentity();
    if ('error' in identity) return { success: false, error: identity.error };

    // Close any existing open sessions for this cashier first
    await supabaseAdmin
        .from('cash_register_sessions')
        .update({ status: 'closed', closed_at: new Date().toISOString() })
        .eq('cashier_id', identity.staff.id)
        .eq('status', 'open');

    const { data, error } = await supabaseAdmin
        .from('cash_register_sessions')
        .insert({
            cashier_id: identity.staff.id,
            opening_float: openingFloat,
            status: 'open'
        })
        .select()
        .single();

    if (error) return { success: false, error: error.message };
    return { success: true, session: data };
}

export async function closeRegisterSession(sessionId: string, closingAmount: number) {
    const identity = await requireCashierIdentity();
    if ('error' in identity) return { success: false, error: identity.error };

    const { error } = await supabaseAdmin
        .from('cash_register_sessions')
        .update({
            status: 'closed',
            closing_amount: closingAmount,
            closed_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .eq('cashier_id', identity.staff.id);

    if (error) return { success: false, error: error.message };
    return { success: true };
}

export async function getActiveRegisterSession() {
    const identity = await requireCashierIdentity();
    if ('error' in identity) return { success: false, error: identity.error, session: null };

    const { data, error } = await supabaseAdmin
        .from('cash_register_sessions')
        .select('*')
        .eq('cashier_id', identity.staff.id)
        .eq('status', 'open')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) return { success: false, error: error.message, session: null };
    return { success: true, session: data };
}

// ─── FIX 2: Petty expense management ────────────────────────────────────────

export async function addPettyExpense(
    sessionId: string,
    description: string,
    amount: number
) {
    const identity = await requireCashierIdentity();
    if ('error' in identity) return { success: false, error: identity.error };

    const { data, error } = await supabaseAdmin
        .from('petty_expenses')
        .insert({
            register_session_id: sessionId,
            description,
            amount,
            recorded_by: identity.staff.id
        })
        .select()
        .single();

    if (error) return { success: false, error: error.message };
    return { success: true, expense: data };
}

export async function getSessionExpenses(sessionId: string) {
    const { data, error } = await supabaseAdmin
        .from('petty_expenses')
        .select('*')
        .eq('register_session_id', sessionId)
        .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message, expenses: [] };
    return { success: true, expenses: data ?? [] };
}

// ─── FIX 1: Real payment breakdown from bills & bill_payments table ──────────

export async function getTodayPaymentBreakdown() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: splitPayments } = await supabaseAdmin
        .from('bill_payments')
        .select('payment_method, amount')
        .gte('created_at', today.toISOString());

    if (splitPayments && splitPayments.length > 0) {
        let cash = 0, card = 0, upi = 0;
        for (const p of splitPayments) {
            const amt = Number(p.amount) || 0;
            if (p.payment_method === 'cash') cash += amt;
            else if (p.payment_method === 'card') card += amt;
            else if (p.payment_method === 'upi') upi += amt;
        }
        return { cash, card, upi };
    }

    const { data, error } = await supabaseAdmin
        .from('bills')
        .select('payment_method, total')
        .gte('paid_at', today.toISOString());

    if (error || !data) return { cash: 0, card: 0, upi: 0 };

    let cash = 0, card = 0, upi = 0;
    for (const bill of data) {
        const t = Number(bill.total) || 0;
        if (bill.payment_method === 'cash') cash += t;
        else if (bill.payment_method === 'card') card += t;
        else if (bill.payment_method === 'upi') upi += t;
        else cash += t;
    }
    return { cash, card, upi };
}

// ─── Table transfer server action ───────────────────────────────────────────

export async function transferTableOrder(fromTableId: string, toTableId: string) {
    const identity = await requireCashierIdentity();
    if ('error' in identity) return { success: false, error: identity.error };

    const { error } = await supabaseAdmin
        .from('orders')
        .update({ table_id: toTableId })
        .eq('table_id', fromTableId)
        .in('status', ['confirmed', 'preparing', 'ready', 'served', 'on_hold']);

    if (error) return { success: false, error: `Transfer failed: ${error.message}` };

    await supabaseAdmin.from('staff_activity_log').insert({
        staff_id: identity.staff.id,
        action: 'TABLE_TRANSFERRED',
        details: { from_table_id: fromTableId, to_table_id: toTableId }
    });

    revalidatePath('/staff/billing');
    revalidatePath('/staff/orders');
    return { success: true };
}

export async function fetchBillingDashboardData() {
    try {
        const [tablesRes, activeOrdersRes, historyOrdersRes, menuRes, staffRes, attendanceRes, settingsRes, rolesRes] = await Promise.all([
            supabaseAdmin.from('restaurant_tables').select('*').order('table_no'),
            supabaseAdmin.from('orders').select(`
                id, status, created_at, customer_name, customer_phone, table_id, source, token_no,
                restaurant_tables(table_no, id),
                order_items(id, qty, price_at_order, notes, discount_percent, discount_reason, menu_items(id, name, is_veg))
            `).in('status', ['confirmed', 'preparing', 'ready', 'served', 'on_hold']).order('created_at', { ascending: false }),
            supabaseAdmin.from('orders').select(`
                id, status, created_at, customer_name, customer_phone, table_id, source, token_no,
                restaurant_tables(table_no, id),
                order_items(id, qty, price_at_order, notes, discount_percent, discount_reason, menu_items(id, name, is_veg))
            `).in('status', ['billed', 'cancelled']).order('created_at', { ascending: false }).limit(200),
            supabaseAdmin.from('menu_items').select('*, categories(name)').order('name'),
            supabaseAdmin.from('staff_users').select('*, roles:roles!staff_users_role_id_fkey(name)').order('name'),
            supabaseAdmin.from('staff_attendance').select('*, staff_users(name)').order('clock_in', { ascending: false }).limit(100),
            supabaseAdmin.from('restaurant_settings').select('*').limit(1).single(),
            supabaseAdmin.from('roles').select('*, role_permissions(permissions(key))')
        ]);

        return {
            success: true,
            tables: tablesRes.data || [],
            activeOrders: activeOrdersRes.data || [],
            historyOrders: historyOrdersRes.data || [],
            menuItems: menuRes.data || [],
            staff: staffRes.data || [],
            attendance: attendanceRes.data || [],
            settings: settingsRes.data || null,
            roles: rolesRes.data || []
        };
    } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to fetch billing data' };
    }
}

