import React from 'react';
import { WaiterDash } from './WaiterDash';
import { verifyStaff } from '@/features/ordering/actions/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function WaiterOrdersPage() {
    const auth = await verifyStaff();
    if (!auth.success || !auth.user) {
        redirect('/staff/login');
    }

    const isAdmin = auth.user.roleName.toLowerCase() === 'admin';
    const hasAccess = isAdmin || auth.user.permissions.some(p => [
        'view_orders', 'confirm_orders', 'edit_orders', 'manage_tables',
        'view_kitchen_queue', 'update_prep_status', 'view_billing', 'generate_bills'
    ].includes(p));
    if (!hasAccess) {
        redirect('/staff/dashboard');
    }

    return (
        <main className="min-h-screen bg-[#F6EEDF] p-4 lg:p-12 pb-24">
            <div className="max-w-7xl mx-auto">
                <header className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-display font-black text-[#4E1414]">Waiter Center</h1>
                        <p className="text-[#241B15] font-semibold opacity-70 mt-1 text-sm lg:text-base">Hello, {auth.user.name}</p>
                    </div>
                </header>

                <WaiterDash activeUser={auth.user} />
            </div>
        </main>
    );
}
