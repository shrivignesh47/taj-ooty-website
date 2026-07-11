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

    const isAdmin = auth.user.roleName.toLowerCase() === 'admin';
    const hasAccess = isAdmin || auth.user.permissions.some(p => ['manage_staff', 'view_revenue', 'manage_roles'].includes(p));
    if (!hasAccess) {
        redirect('/staff/dashboard');
    }

    return <AdminDash />;
}
