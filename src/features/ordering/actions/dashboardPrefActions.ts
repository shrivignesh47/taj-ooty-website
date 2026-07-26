"use server";

import { verifyStaff } from './auth';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { StaffRole, getDefaultPreferences, WIDGET_CATALOG } from '../config/widgetCatalog';
import { revalidatePath } from 'next/cache';

export async function getDashboardPreferences(role: StaffRole) {
    const auth = await verifyStaff();
    if (!auth.success || !auth.user) {
        return { success: true, preferences: { visible: [], order: [] } };
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('dashboard_preferences')
            .select('visible_widgets, widget_order')
            .eq('staff_id', auth.user.id)
            .maybeSingle();

        if (error || !data) {
            return { success: true, preferences: { visible: [], order: [] } };
        }

        const roleCatalog = WIDGET_CATALOG[role] || WIDGET_CATALOG.cashier;
        const validIds = new Set(roleCatalog.map(w => w.id));

        const visible = Array.isArray(data.visible_widgets)
            ? (data.visible_widgets as string[]).filter(id => validIds.has(id))
            : getDefaultPreferences(role).visible;

        const order = Array.isArray(data.widget_order)
            ? (data.widget_order as string[]).filter(id => validIds.has(id))
            : getDefaultPreferences(role).order;

        // Ensure any new catalog items missing from saved order are appended
        roleCatalog.forEach(w => {
            if (!order.includes(w.id)) {
                order.push(w.id);
            }
        });

        return {
            success: true,
            preferences: { visible, order }
        };
    } catch (e: unknown) {
        console.error("Failed to load dashboard preferences:", e);
        return { success: true, preferences: { visible: [], order: [] } };
    }
}

export async function saveDashboardPreferences(visibleWidgets: string[], widgetOrder: string[]) {
    const auth = await verifyStaff();
    if (!auth.success || !auth.user) {
        return { success: false, error: 'Unauthorized Session' };
    }

    try {
        const { error } = await supabaseAdmin
            .from('dashboard_preferences')
            .upsert({
                staff_id: auth.user.id,
                visible_widgets: visibleWidgets,
                widget_order: widgetOrder,
                updated_at: new Date().toISOString()
            }, { onConflict: 'staff_id' });

        if (error) throw error;

        revalidatePath('/staff/dashboard');
        revalidatePath('/staff/billing');
        revalidatePath('/staff/orders');
        revalidatePath('/staff/kitchen');
        revalidatePath('/staff/admin');
        return { success: true };
    } catch (e: unknown) {
        return { success: false, error: e instanceof Error ? e.message : 'Failed to save layout' };
    }
}
