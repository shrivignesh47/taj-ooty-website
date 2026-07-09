import React from 'react';
import { BillingDash } from './BillingDash';

export const dynamic = 'force-dynamic';

export default function BillingPage() {
    return (
        <main className="min-h-screen bg-[#F6EEDF] p-6 lg:p-12">
            <div className="max-w-4xl mx-auto">
                <header className="mb-8 border-b border-[#C9974A]/30 pb-6">
                    <h1 className="text-3xl font-display font-bold text-[#4E1414]">Cashier & Billing</h1>
                    <p className="text-[#241B15] opacity-70 mt-1 font-medium">Manage tables that are currently eating or ready for checkout.</p>
                </header>

                <BillingDash />
            </div>
        </main>
    );
}
