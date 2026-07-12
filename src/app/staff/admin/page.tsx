import React from 'react';
import { AdminDash } from './AdminDash';
import { verifyStaff } from '@/features/ordering/actions/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
    const auth = await verifyStaff();
    if (!auth.success || !auth.user) {
        redirect('/staff/login');
    }

    // Check permissions only — admin has all permissions via verifyStaff()
    const hasAccess = auth.user.permissions.some(p => [
        'manage_staff', 'view_revenue', 'manage_roles', 'edit_menu',
        'view_dashboard', 'view_activity_log', 'manage_orders'
    ].includes(p));
    if (!hasAccess) {
        redirect('/staff/dashboard');
    }

    return <AdminDash />;
}
