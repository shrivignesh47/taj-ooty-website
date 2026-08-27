import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export const COOKIE_NAME = 'taj_token';
export const COOKIE_MAX_AGE = 12 * 60 * 60; // 12 hours

export function supabaseUrl() {
    return (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/^"/, '').replace(/"$/, '').trim();
}

export function supabaseAnonKey() {
    return (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').replace(/^"/, '').replace(/"$/, '').trim();
}

/**
 * Decode a JWT payload without any library. Returns null on failure.
 */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
        const decoded = atob(padded);
        return JSON.parse(decoded);
    } catch {
        return null;
    }
}

/**
 * Read the `taj_token` cookie and return the auth user ID (JWT `sub` claim),
 * or null if the cookie is missing / invalid / expired.
 */
export async function getAuthUserId(): Promise<string | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = decodeJwtPayload(token);
    if (!payload || typeof payload.sub !== 'string') return null;

    if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()) return null;

    return payload.sub;
}

/**
 * Create a plain Supabase client (no cookie management) for auth operations
 * like signInWithPassword. The session is never persisted to cookies — the
 * caller returns the access token to the client which sets it via document.cookie.
 */
export function createAuthClient() {
    return createClient(supabaseUrl(), supabaseAnonKey(), {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}
