import React from 'react';
import { logoutStaff, verifyStaff } from '@/features/ordering/actions/auth';
import Link from 'next/link';
import { ChefHat, ClipboardList, IndianRupee, LogOut } from 'lucide-react';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DashboardGate() {
    const auth = await verifyStaff();
    if (!auth.success || !auth.user) {
        redirect('/staff/login');
    }

    const { permissions, roleName } = auth.user;
    const isAdmin = roleName.toLowerCase() === 'admin';

    const hasWaiter = isAdmin || permissions.some(p => ['view_orders', 'confirm_orders', 'edit_orders', 'manage_tables'].includes(p));
    const hasKitchen = isAdmin || permissions.some(p => ['view_kitchen_queue', 'update_prep_status'].includes(p));
    const hasCashier = isAdmin || permissions.some(p => ['view_billing', 'generate_bills'].includes(p));
    const hasAdmin = isAdmin || permissions.some(p => ['manage_staff', 'view_revenue', 'manage_roles'].includes(p));

    return (
        <div className="min-h-screen bg-[#F6EEDF] p-6 lg:p-12 relative overflow-hidden flex flex-col">

            <header className="max-w-5xl mx-auto w-full flex justify-between items-center mb-12 border-b border-[#C9974A]/30 pb-6">
                <div>
                    <h1 className="text-3xl font-display font-bold text-[#4E1414]">Taj OS Hub</h1>
                    <p className="text-[#241B15] opacity-70 mt-1 uppercase tracking-widest text-xs font-bold">Select Active Station</p>
                </div>

                <form action={logoutStaff}>
                    <button type="submit" className="text-[#4E1414] hover:text-[#C9974A] border border-[#4E1414]/20 hover:border-[#C9974A] px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2">
                        <LogOut className="w-4 h-4" /> Exit
                    </button>
                </form>
            </header>

            <main className="max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 flex-grow pb-12">

                {hasWaiter && (
                    <Link href="/staff/orders" className="group bg-white rounded-2xl shadow-xl border border-[#C9974A]/20 p-8 flex flex-col items-center justify-center text-center hover:-translate-y-2 transition-transform duration-300">
                        <div className="w-20 h-20 bg-[#4E1414] rounded-full flex items-center justify-center mb-6 text-[#C9974A] group-hover:bg-[#C9974A] group-hover:text-[#4E1414] transition-colors">
                            <ClipboardList className="w-10 h-10" />
                        </div>
                        <h2 className="text-xl font-bold text-[#241B15] mb-2 font-display">Waiters & Captains</h2>
                        <p className="text-[#241B15]/60 text-sm font-medium">Verify pending tables and push active orders to the Kitchen line.</p>
                    </Link>
                )}

                {hasKitchen && (
                    <Link href="/staff/kitchen" className="group bg-[#241B15] rounded-2xl shadow-xl border border-[#C9974A]/20 p-8 flex flex-col items-center justify-center text-center hover:-translate-y-2 transition-transform duration-300">
                        <div className="w-20 h-20 bg-[#C9974A] rounded-full flex items-center justify-center mb-6 text-[#241B15] group-hover:bg-white transition-colors">
                            <ChefHat className="w-10 h-10" />
                        </div>
                        <h2 className="text-xl font-bold text-[#F6EEDF] mb-2 font-display">Kitchen Display</h2>
                        <p className="text-[#F6EEDF]/60 text-sm font-medium">Live KOT streams mapped for chefs. Mark prep-lines ready for pickup.</p>
                    </Link>
                )}

                {hasCashier && (
                    <Link href="/staff/billing" className="group bg-white rounded-2xl shadow-xl border border-[#C9974A]/20 p-8 flex flex-col items-center justify-center text-center hover:-translate-y-2 transition-transform duration-300">
                        <div className="w-20 h-20 bg-[#4E1414] rounded-full flex items-center justify-center mb-6 text-[#C9974A] group-hover:bg-[#C9974A] group-hover:text-[#4E1414] transition-colors">
                            <IndianRupee className="w-10 h-10" />
                        </div>
                        <h2 className="text-xl font-bold text-[#241B15] mb-2 font-display">Cashier Desk</h2>
                        <p className="text-[#241B15]/60 text-sm font-medium">Monitor active diners, finalize invoices, and close out standard bills.</p>
                    </Link>
                )}

                {hasAdmin && (
                    <Link href="/staff/admin" className="group bg-[#F6EEDF] rounded-2xl shadow-xl border-2 border-dashed border-[#4E1414]/30 p-8 flex flex-col items-center justify-center text-center hover:-translate-y-2 hover:border-[#4E1414] transition-all duration-300">
                        <div className="w-20 h-20 bg-transparent rounded-full flex items-center justify-center mb-6 text-[#4E1414] group-hover:scale-110 transition-transform">
                            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-[#4E1414] mb-2 font-display">Master Admin</h2>
                        <p className="text-[#4E1414]/70 text-sm font-medium">Aggregated revenue analytics, KOT tracking, and full workforce roster.</p>
                    </Link>
                )}

                {!hasWaiter && !hasKitchen && !hasCashier && !hasAdmin && (
                    <div className="col-span-full bg-white border border-[#C9974A]/20 rounded-2xl p-12 text-center">
                        <p className="text-[#4E1414] font-bold text-lg mb-2">No Permitted Stations</p>
                        <p className="text-sm text-[#241B15]/60">You do not currently have any active permissions assigned to your role. Please request station privileges from your administrator.</p>
                    </div>
                )}

            </main>
        </div>
    );
}
