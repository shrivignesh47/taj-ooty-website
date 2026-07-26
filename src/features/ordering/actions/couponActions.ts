"use server";

import { supabaseAdmin } from '../lib/supabaseAdmin';
import { revalidatePath } from 'next/cache';

export interface CouponRecord {
    id: string;
    code: string;
    type: 'pct' | 'amt';
    value: number;
    description: string | null;
    is_active: boolean;
    valid_from: string | null;
    valid_until: string | null;
    usage_limit: number | null;
    times_used: number;
    created_at: string;
}

export async function fetchActiveCoupons(): Promise<CouponRecord[]> {
    const { data, error } = await supabaseAdmin
        .from('coupons')
        .select('*')
        .eq('is_active', true)
        .order('code');

    if (error || !data) return [];
    return data as CouponRecord[];
}

export async function fetchAllCoupons(): Promise<CouponRecord[]> {
    const { data, error } = await supabaseAdmin
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as CouponRecord[];
}

export async function validateAndApplyCoupon(code: string) {
    const cleanCode = code.trim().toUpperCase();
    const { data: coupon, error } = await supabaseAdmin
        .from('coupons')
        .select('*')
        .eq('code', cleanCode)
        .single();

    if (error || !coupon) {
        return { success: false, error: 'Invalid coupon code' };
    }

    if (!coupon.is_active) {
        return { success: false, error: 'Coupon is currently inactive' };
    }

    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
        return { success: false, error: 'Coupon is not valid yet' };
    }

    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
        return { success: false, error: 'Coupon has expired' };
    }

    if (coupon.usage_limit && coupon.times_used >= coupon.usage_limit) {
        return { success: false, error: 'Coupon usage limit reached' };
    }

    // Increment times_used
    await supabaseAdmin
        .from('coupons')
        .update({ times_used: coupon.times_used + 1 })
        .eq('id', coupon.id);

    return {
        success: true,
        coupon: {
            code: coupon.code,
            type: coupon.type as 'pct' | 'amt',
            value: Number(coupon.value),
            description: coupon.description
        }
    };
}

export async function createCoupon(payload: {
    code: string;
    type: 'pct' | 'amt';
    value: number;
    description?: string;
    usage_limit?: number | null;
    valid_until?: string | null;
}) {
    const { error } = await supabaseAdmin.from('coupons').insert({
        code: payload.code.trim().toUpperCase(),
        type: payload.type,
        value: payload.value,
        description: payload.description || null,
        usage_limit: payload.usage_limit || null,
        valid_until: payload.valid_until || null,
        is_active: true,
        times_used: 0
    });

    if (error) return { success: false, error: error.message };
    revalidatePath('/staff/billing');
    revalidatePath('/staff/admin');
    return { success: true };
}

export async function toggleCouponActive(id: string, is_active: boolean) {
    const { error } = await supabaseAdmin
        .from('coupons')
        .update({ is_active })
        .eq('id', id);

    if (error) return { success: false, error: error.message };
    revalidatePath('/staff/billing');
    revalidatePath('/staff/admin');
    return { success: true };
}

export async function deleteCoupon(id: string) {
    const { error } = await supabaseAdmin
        .from('coupons')
        .delete()
        .eq('id', id);

    if (error) return { success: false, error: error.message };
    revalidatePath('/staff/billing');
    revalidatePath('/staff/admin');
    return { success: true };
}
