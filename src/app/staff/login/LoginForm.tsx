"use client";

import { useState } from 'react';
import { loginStaff } from '@/features/ordering/actions/auth';
import { LogIn, Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

export function LoginForm() {
    const searchParams = useSearchParams();
    const specificError = searchParams.get('error');

    const [isLoading, setIsLoading] = useState(false);
    const [localError, setLocalError] = useState("");

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setLocalError("");

        const formData = new FormData(e.currentTarget);
        try {
            const res = await loginStaff(formData);

            if (res?.error) {
                setLocalError(res.error);
                setIsLoading(false);
            } else if (res?.success && res.redirectUrl) {
                window.location.href = res.redirectUrl;
            } else {
                setLocalError("Unexpected response from server.");
                setIsLoading(false);
            }
        } catch (err) {
            setLocalError("Network error. Please refresh the page or restart the server.");
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">

            {(localError || specificError) && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-xs font-semibold text-center border border-red-200">
                    {localError || "UNAUTHORIZED: Your account is disabled or lacks staff roll access."}
                </div>
            )}

            <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-[#4E1414]">Email</label>
                <input
                    name="email"
                    required
                    type="email"
                    className="w-full bg-white border border-[#C9974A]/30 rounded-lg px-4 py-3 text-[#241B15] focus:outline-none focus:ring-2 focus:ring-[#C9974A]/50 transition-all font-medium"
                    placeholder="staff@tajooty.com"
                />
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-[#4E1414]">Password</label>
                <input
                    name="password"
                    required
                    type="password"
                    className="w-full bg-white border border-[#C9974A]/30 rounded-lg px-4 py-3 text-[#241B15] focus:outline-none focus:ring-2 focus:ring-[#C9974A]/50 transition-all font-medium"
                />
            </div>

            <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#4E1414] hover:bg-[#350C0C] disabled:bg-[#4E1414]/70 disabled:cursor-not-allowed text-[#F6EEDF] font-semibold py-3.5 px-4 rounded-lg flex items-center justify-center gap-3 transition-colors shadow-lg"
            >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                {isLoading ? "Authenticating..." : "Access Dashboard"}
            </button>
        </form>
    );
}
