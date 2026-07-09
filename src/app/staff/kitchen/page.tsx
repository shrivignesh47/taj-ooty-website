import React from 'react';
import { KitchenDash } from './KitchenDash';

export const dynamic = 'force-dynamic';

export default function KitchenPage() {
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
                </header>

                <KitchenDash />
            </div>
        </main>
    );
}
