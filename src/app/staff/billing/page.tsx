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

    // Check permissions and exclude admin from billing dashboard
    const hasAccess = auth.user.permissions.some(p => [
        'view_billing', 'generate_bills', 'view_revenue'
    ].includes(p)) && auth.user.roleName.toLowerCase() !== 'admin';
    
    if (!hasAccess) {
        redirect('/staff/dashboard');
    }

    return (
        <BillingDash
            activeUser={auth.user}
        />
    );
}
