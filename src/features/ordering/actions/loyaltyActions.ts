"use server";

import { supabaseAdmin } from '../lib/supabaseAdmin';

export interface CustomerLoyaltyData {
    customer_phone: string;
    customer_name: string | null;
    points_balance: number;
    lifetime_points_earned: number;
    lifetime_visits: number;
}

export interface LoyaltyTransactionData {
    id: string;
    customer_phone: string;
    bill_id: string | null;
    type: 'earned' | 'redeemed' | 'adjusted';
    points: number;
    note: string | null;
    created_at: string;
}

export async function getLoyaltyBalance(phone: string): Promise<{
    success: boolean;
    loyalty: CustomerLoyaltyData | null;
    error?: string;
}> {
    const cleanPhone = phone.trim();
    if (!cleanPhone) return { success: true, loyalty: null };

    try {
        const { data, error } = await supabaseAdmin
            .from('customer_loyalty')
            .select('*')
            .eq('customer_phone', cleanPhone)
            .maybeSingle();

        if (error) return { success: false, loyalty: null, error: error.message };
        if (!data) return { success: true, loyalty: null };

        return {
            success: true,
            loyalty: {
                customer_phone: data.customer_phone,
                customer_name: data.customer_name,
                points_balance: Number(data.points_balance) || 0,
                lifetime_points_earned: Number(data.lifetime_points_earned) || 0,
                lifetime_visits: Number(data.lifetime_visits) || 0
            }
        };
    } catch (e: unknown) {
        return { success: false, loyalty: null, error: String(e) };
    }
}

export async function earnLoyaltyPoints(
    phone: string,
    customerName: string,
    billAmount: number,
    billId?: string
): Promise<{ success: boolean; pointsEarned: number; newBalance: number; error?: string }> {
    const cleanPhone = phone.trim();
    if (!cleanPhone || billAmount <= 0) {
        return { success: false, pointsEarned: 0, newBalance: 0, error: 'Invalid phone or bill amount' };
    }

    try {
        // Fetch restaurant loyalty settings
        const { data: settings } = await supabaseAdmin
            .from('restaurant_settings')
            .select('loyalty_enabled, loyalty_points_per_rupee')
            .limit(1)
            .single();

        if (settings && settings.loyalty_enabled === false) {
            return { success: true, pointsEarned: 0, newBalance: 0 };
        }

        const rate = Number(settings?.loyalty_points_per_rupee) || 1;
        const pointsEarned = Math.floor(billAmount * rate);

        if (pointsEarned <= 0) {
            return { success: true, pointsEarned: 0, newBalance: 0 };
        }

        // Fetch existing customer row
        const { data: existing } = await supabaseAdmin
            .from('customer_loyalty')
            .select('*')
            .eq('customer_phone', cleanPhone)
            .maybeSingle();

        let newBalance = pointsEarned;
        let newEarned = pointsEarned;
        let newVisits = 1;

        if (existing) {
            newBalance = Number(existing.points_balance) + pointsEarned;
            newEarned = Number(existing.lifetime_points_earned) + pointsEarned;
            newVisits = Number(existing.lifetime_visits) + 1;

            await supabaseAdmin
                .from('customer_loyalty')
                .update({
                    customer_name: customerName || existing.customer_name,
                    points_balance: newBalance,
                    lifetime_points_earned: newEarned,
                    lifetime_visits: newVisits,
                    updated_at: new Date().toISOString()
                })
                .eq('customer_phone', cleanPhone);
        } else {
            await supabaseAdmin.from('customer_loyalty').insert({
                customer_phone: cleanPhone,
                customer_name: customerName || 'Guest',
                points_balance: newBalance,
                lifetime_points_earned: newEarned,
                lifetime_visits: newVisits
            });
        }

        // Log transaction
        await supabaseAdmin.from('loyalty_transactions').insert({
            customer_phone: cleanPhone,
            bill_id: billId || null,
            type: 'earned',
            points: pointsEarned,
            note: `Earned on ₹${billAmount.toFixed(0)} bill`
        });

        return { success: true, pointsEarned, newBalance };
    } catch (e: unknown) {
        return { success: false, pointsEarned: 0, newBalance: 0, error: String(e) };
    }
}

export async function redeemLoyaltyPoints(
    phone: string,
    pointsToRedeem: number,
    billId?: string
): Promise<{ success: boolean; discountAmount: number; remainingPoints: number; error?: string }> {
    const cleanPhone = phone.trim();
    if (!cleanPhone || pointsToRedeem <= 0) {
        return { success: false, discountAmount: 0, remainingPoints: 0, error: 'Invalid parameters' };
    }

    try {
        const { data: customer } = await supabaseAdmin
            .from('customer_loyalty')
            .select('*')
            .eq('customer_phone', cleanPhone)
            .maybeSingle();

        if (!customer) {
            return { success: false, discountAmount: 0, remainingPoints: 0, error: 'Customer loyalty account not found' };
        }

        const currentBalance = Number(customer.points_balance) || 0;
        if (currentBalance < pointsToRedeem) {
            return { success: false, discountAmount: 0, remainingPoints: currentBalance, error: `Insufficient points balance (Available: ${currentBalance})` };
        }

        const { data: settings } = await supabaseAdmin
            .from('restaurant_settings')
            .select('loyalty_redemption_rate')
            .limit(1)
            .single();

        const redemptionRate = Number(settings?.loyalty_redemption_rate) || 0.5;
        const discountAmount = pointsToRedeem * redemptionRate;
        const remainingPoints = currentBalance - pointsToRedeem;

        // Deduct points
        await supabaseAdmin
            .from('customer_loyalty')
            .update({
                points_balance: remainingPoints,
                updated_at: new Date().toISOString()
            })
            .eq('customer_phone', cleanPhone);

        // Log transaction
        await supabaseAdmin.from('loyalty_transactions').insert({
            customer_phone: cleanPhone,
            bill_id: billId || null,
            type: 'redeemed',
            points: pointsToRedeem,
            note: `Redeemed ${pointsToRedeem} points for ₹${discountAmount.toFixed(2)} discount`
        });

        return { success: true, discountAmount, remainingPoints };
    } catch (e: unknown) {
        return { success: false, discountAmount: 0, remainingPoints: 0, error: String(e) };
    }
}

export async function getCustomerLoyaltyHistory(phone: string): Promise<{
    success: boolean;
    transactions: LoyaltyTransactionData[];
    error?: string;
}> {
    try {
        const { data, error } = await supabaseAdmin
            .from('loyalty_transactions')
            .select('*')
            .eq('customer_phone', phone)
            .order('created_at', { ascending: false });

        if (error) return { success: false, transactions: [], error: error.message };
        return { success: true, transactions: data || [] };
    } catch (e: unknown) {
        return { success: false, transactions: [], error: String(e) };
    }
}

export async function saveLoyaltySettings(
    enabled: boolean,
    pointsPerRupee: number,
    redemptionRate: number
): Promise<{ success: boolean; error?: string }> {
    try {
        const { data: settings } = await supabaseAdmin.from('restaurant_settings').select('id').limit(1).single();
        if (settings) {
            await supabaseAdmin
                .from('restaurant_settings')
                .update({
                    loyalty_enabled: enabled,
                    loyalty_points_per_rupee: pointsPerRupee,
                    loyalty_redemption_rate: redemptionRate
                })
                .eq('id', settings.id);
        }
        return { success: true };
    } catch (e: unknown) {
        return { success: false, error: String(e) };
    }
}
