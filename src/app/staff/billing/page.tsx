import React from 'react';
import { BillingDash } from './BillingDash';
import { verifyStaff } from '@/features/ordering/actions/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function BillingPage() {
    const auth = await verifyStaff();
    if (!auth.success || !auth.user) {
        redirect('/staff/login');
    }

    // Check permissions only — admin/staff has access if they have billing or general staff/admin permissions
    const hasAccess = auth.user.permissions.some(p => [
        'view_billing', 'generate_bills', 'view_orders', 'confirm_orders', 
        'view_revenue', 'manage_staff', 'manage_roles'
    ].includes(p));
    
    if (!hasAccess) {
        redirect('/staff/login?error=UnauthorizedAccess');
    }

    return (
        <BillingDash
            activeUser={auth.user}
        />
    );
}
