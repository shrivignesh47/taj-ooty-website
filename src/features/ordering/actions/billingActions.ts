"use server";

import { createSupabaseServerClient } from '../lib/supabaseServer';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { revalidatePath } from 'next/cache';

// ─── Auth helper ─────────────────────────────────────────────────────────────

async function requireCashierIdentity() {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' as const };

    const { data: staff, error } = await supabaseAdmin
        .from('staff_users')
        .select('id, role_id')
        .eq('auth_id', user.id)
        .single();

    if (error || !staff) return { error: 'Staff profile not found' as const };
    return { staff };
}

// ─── FIX 1: Real bill settlement with payment_method ────────────────────────

export async function settleBillWithPayment(
    orderIds: string[],
    totalAmount: number,
    paymentMethod: 'cash' | 'card' | 'upi'
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

// ─── FIX 1: Real payment breakdown from bills table ─────────────────────────

export async function getTodayPaymentBreakdown() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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
        else cash += t; // default: cash if null/missing
    }
    return { cash, card, upi };
}
