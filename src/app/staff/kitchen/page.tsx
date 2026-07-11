import React from 'react';
import { KitchenDash } from './KitchenDash';
import { verifyStaff } from '@/features/ordering/actions/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function KitchenPage() {
    const auth = await verifyStaff();
    if (!auth.success || !auth.user) {
        redirect('/staff/login');
    }

    const isAdmin = auth.user.roleName.toLowerCase() === 'admin';
    const hasAccess = isAdmin || auth.user.permissions.some(p => ['view_kitchen_queue', 'update_prep_status'].includes(p));
    if (!hasAccess) {
        redirect('/staff/dashboard');
    }

    return (
        <main className="min-h-screen bg-[#241B15] p-6 lg:p-12 relative overflow-hidden">
            {/* Abstract dark prestige mapping for kitchen */}
            <div className="absolute inset-0 z-0 opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#C9974A] via-[#350C0C] to-[#241B15]" />

            <div className="relative z-10 max-w-7xl mx-auto flex flex-col h-full">
                <header className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-[#F6EEDF]">Kitchen Display System</h1>
                        <p className="text-[#C9974A] opacity-70 mt-1 uppercase tracking-widest text-xs font-bold">KOT Management Hub</p>
                    </div>
                    <Link href="/staff/dashboard" className="text-sm font-bold bg-[#350C0C] border border-[#C9974A]/30 text-[#F6EEDF] px-4 py-2 rounded-xl shadow-sm hover:bg-[#4E1414] transition-all">
                        ← Stations Hub
                    </Link>
                </header>

                <KitchenDash />
            </div>
        </main>
    );
}
