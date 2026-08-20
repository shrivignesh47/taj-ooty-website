"use server";;;;;

import { createClient } from '@supabase/supabase-js';
import { verifyStaff } from './auth';

const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface StaffNotificationItem {
    id: string;
    sender_name: string;
    sender_role: string;
    title: string;
    message: string;
    target_role: string;
    priority: 'normal' | 'urgent';
    read_by: string[];
    created_at: string;
}

export async function sendStaffNotification(payload: {
    title: string;
    message: string;
    targetRole?: string;
    priority?: 'normal' | 'urgent';
}) {
    const auth = await verifyStaff();
    const senderName = auth.user?.name || 'Admin Desk';
    const senderRole = auth.user?.roleName || 'Admin';

    const { error } = await admin.from('staff_activity_log').insert({
        staff_id: auth.user?.id || null,
        action: 'STAFF_NOTIFICATION',
        details: {
            sender_name: senderName,
            sender_role: senderRole,
            title: payload.title.trim(),
            message: payload.message.trim(),
            target_role: (payload.targetRole || 'all').toLowerCase(),
            priority: payload.priority || 'normal',
            read_by: []
        }
    });

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true };
}

export async function fetchStaffNotifications(): Promise<{ success: boolean; data: StaffNotificationItem[]; error?: string }> {
    const { data, error } = await admin
        .from('staff_activity_log')
        .select('*')
        .eq('action', 'STAFF_NOTIFICATION')
        .order('created_at', { ascending: false })
        .limit(40);

    if (error) {
        return { success: false, data: [], error: error.message };
    }

    const mapped: StaffNotificationItem[] = (data || []).map(row => {
        const d = row.details || {};
        return {
            id: row.id,
            sender_name: d.sender_name || 'Staff',
            sender_role: d.sender_role || 'Staff',
            title: d.title || 'Notification',
            message: d.message || '',
            target_role: d.target_role || 'all',
            priority: d.priority || 'normal',
            read_by: Array.isArray(d.read_by) ? d.read_by : [],
            created_at: row.created_at
        };
    });

    return { success: true, data: mapped };
}

export async function markNotificationAsRead(notificationId: string, staffUserId: string) {
    const { data: row } = await admin
        .from('staff_activity_log')
        .select('details')
        .eq('id', notificationId)
        .single();

    if (row && row.details) {
        const currentReadBy: string[] = Array.isArray(row.details.read_by) ? row.details.read_by : [];
        if (!currentReadBy.includes(staffUserId)) {
            const updatedDetails = {
                ...row.details,
                read_by: [...currentReadBy, staffUserId]
            };
            await admin
                .from('staff_activity_log')
                .update({ details: updatedDetails })
                .eq('id', notificationId);
        }
    }
    return { success: true };
}

export async function markAllNotificationsAsRead(staffUserId: string) {
    const { data: rows } = await admin
        .from('staff_activity_log')
        .select('id, details')
        .eq('action', 'STAFF_NOTIFICATION');

    if (rows) {
        for (const row of rows) {
            const d = row.details || {};
            const currentReadBy: string[] = Array.isArray(d.read_by) ? d.read_by : [];
            if (!currentReadBy.includes(staffUserId)) {
                await admin
                    .from('staff_activity_log')
                    .update({
                        details: {
                            ...d,
                            read_by: [...currentReadBy, staffUserId]
                        }
                    })
                    .eq('id', row.id);
            }
        }
    }
    return { success: true };
}

export async function deleteNotification(notificationId: string) {
    const { error } = await admin
        .from('staff_activity_log')
        .delete()
        .eq('id', notificationId);

    if (error) return { success: false, error: error.message };
    return { success: true };
}

export async function clearAllNotifications() {
    const { error } = await admin
        .from('staff_activity_log')
        .delete()
        .eq('action', 'STAFF_NOTIFICATION');

    if (error) return { success: false, error: error.message };
    return { success: true };
}
