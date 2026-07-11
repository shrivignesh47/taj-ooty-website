import React from 'react';
import { BillingDash } from './BillingDash';
import { verifyStaff } from '@/features/ordering/actions/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function BillingPage() {
    const auth = await verifyStaff();
    if (!auth.success || !auth.user) {
        redirect('/staff/login');
    }

    const isAdmin = auth.user.roleName.toLowerCase() === 'admin';
    const hasAccess = isAdmin || auth.user.permissions.some(p => ['view_billing', 'generate_bills'].includes(p));
    if (!hasAccess) {
        redirect('/staff/dashboard');
    }

    return (
        <main className="min-h-screen bg-[#F6EEDF] p-6 lg:p-12">
            <div className="max-w-4xl mx-auto">
                <header className="mb-8 border-b border-[#C9974A]/30 pb-6 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-[#4E1414]">Cashier & Billing</h1>
                        <p className="text-[#241B15] opacity-70 mt-1 font-medium">Manage tables that are currently eating or ready for checkout.</p>
                    </div>
                    <Link href="/staff/dashboard" className="text-sm font-bold bg-white border border-[#C9974A]/30 text-[#4E1414] px-4 py-2 rounded-xl shadow-sm hover:bg-[#F6EEDF] transition-all">
                        ← Stations Hub
                    </Link>
                </header>

                <BillingDash />
            </div>
        </main>
    );
}
