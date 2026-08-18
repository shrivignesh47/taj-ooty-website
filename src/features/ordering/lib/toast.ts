/**
 * Lightweight global toast singleton.
 * Works from any file — hooks, components, server action callbacks.
 * No React context or npm packages required.
 *
 * Usage:
 *   import { toast } from '@/features/ordering/lib/toast';
 *   toast.success('Bill settled!');
 *   toast.error('Failed to confirm order');
 *   toast.warning('Only 2 portions left!');
 *   toast.info('Clocked in successfully.');
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
    id: string;
    message: string;
    type: ToastType;
}

type Listener = (t: ToastItem) => void;

const listeners = new Set<Listener>();

export function addToastListener(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

function emit(message: string, type: ToastType): string {
    const id = Math.random().toString(36).slice(2, 9);
    const item: ToastItem = { id, message, type };
    listeners.forEach(fn => fn(item));
    return id;
}

export const toast = {
    success: (message: string) => emit(message, 'success'),
    error: (message: string) => emit(message, 'error'),
    warning: (message: string) => emit(message, 'warning'),
    info: (message: string) => emit(message, 'info'),
};
