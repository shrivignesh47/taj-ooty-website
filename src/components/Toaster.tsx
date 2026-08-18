"use client";

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { addToastListener, ToastItem, ToastType } from '@/features/ordering/lib/toast';

const ICONS: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 className="w-4 h-4 shrink-0" />,
    error: <XCircle className="w-4 h-4 shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 shrink-0" />,
    info: <Info className="w-4 h-4 shrink-0" />,
};

const STYLES: Record<ToastType, string> = {
    success: 'bg-emerald-600 text-white border-emerald-500',
    error:   'bg-red-700 text-white border-red-600',
    warning: 'bg-amber-500 text-white border-amber-400',
    info:    'bg-[#4E1414] text-[#F6EEDF] border-[#C9974A]/50',
};

const AUTO_DISMISS_MS = 4000;

/**
 * Drop <Toaster /> anywhere inside the component tree of a page.
 * It listens to the global toast singleton and renders animated toasts.
 *
 * Example:
 *   export function BillingDash() {
 *     return (
 *       <>
 *         <Toaster />
 *         {... rest of UI ...}
 *       </>
 *     );
 *   }
 */
export function Toaster() {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    useEffect(() => {
        return addToastListener(item => {
            setToasts(prev => [...prev, item]);
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== item.id));
            }, AUTO_DISMISS_MS);
        });
    }, []);

    const dismiss = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    return (
        <div
            aria-live="polite"
            className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 pointer-events-none"
        >
            <AnimatePresence mode="popLayout">
                {toasts.map(t => (
                    <motion.div
                        key={t.id}
                        layout
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 60, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className={`pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-2xl shadow-2xl border max-w-sm text-sm font-semibold ${STYLES[t.type]}`}
                    >
                        {ICONS[t.type]}
                        <span className="flex-1 leading-snug">{t.message}</span>
                        <button
                            onClick={() => dismiss(t.id)}
                            aria-label="Dismiss notification"
                            className="opacity-70 hover:opacity-100 transition-opacity mt-0.5 cursor-pointer shrink-0"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
