import React from 'react';
import { LoginForm } from './LoginForm';

export default function StaffLoginPage() {
    return (
        <main className="min-h-screen bg-[#241B15] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Dark premium backdrop */}
            <div className="absolute inset-0 z-0 opacity-30 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#4E1414] via-[#241B15] to-[#241B15]" />

            <div className="relative z-10 w-full max-w-sm">
                <div className="mb-8 text-center text-[#F6EEDF]">
                    <h1 className="text-3xl font-display font-bold tracking-wider mb-2">Taj OS</h1>
                    <p className="text-sm opacity-60 font-medium tracking-widest uppercase">Staff Portal Auth</p>
                </div>

                <div className="bg-[#F6EEDF] rounded-2xl shadow-2xl p-8 border border-[#C9974A]/20">
                    <React.Suspense fallback={<div className="text-center p-4">Loading auth...</div>}>
                        <LoginForm />
                    </React.Suspense>
                </div>
            </div>
        </main>
    );
}
