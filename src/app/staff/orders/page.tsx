import React from 'react';
import { WaiterDash } from './WaiterDash';

export const dynamic = 'force-dynamic';

export default function WaiterOrdersPage() {
    return (
        <main className="min-h-screen bg-[#F6EEDF] p-6 lg:p-12">
            <div className="max-w-7xl mx-auto">
                <header className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-[#4E1414]">Waiter Control Center</h1>
                        <p className="text-[#241B15] opacity-70 mt-1">Live &apos;pending&apos; unconfirmed intents and active &apos;confirmed&apos; table routes.</p>
                    </div>
                </header>

                <WaiterDash />
            </div>
        </main>
    );
}
