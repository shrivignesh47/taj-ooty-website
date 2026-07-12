import React from 'react';
import { KitchenDash } from './KitchenDash';
import { verifyStaff } from '@/features/ordering/actions/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function KitchenPage() {
    const auth = await verifyStaff();
    if (!auth.success || !auth.user) {
        redirect('/staff/login');
    }

    // Check permissions only — admin has all permissions via verifyStaff()
    const hasAccess = auth.user.permissions.some(p => ['view_kitchen_queue', 'update_prep_status'].includes(p));
    if (!hasAccess) {
        redirect('/staff/dashboard');
    }

    return (
        <main className="min-h-screen bg-[#241B15] relative overflow-x-hidden">
            {/* Abstract dark prestige mapping for kitchen */}
            <div className="absolute inset-0 z-0 opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#C9974A] via-[#350C0C] to-[#241B15] pointer-events-none" />

            <div className="relative z-10 w-full flex flex-col min-h-screen">
                <KitchenDash />
            </div>
        </main>
    );
}
