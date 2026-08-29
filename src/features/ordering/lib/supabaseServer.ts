import { cookies, headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import {
    COOKIE_NAME,
    COOKIE_MAX_AGE,
    USER_ID_HEADER,
    decodeJwtPayload,
} from '@/lib/authCookie';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export { COOKIE_NAME, COOKIE_MAX_AGE, USER_ID_HEADER, decodeJwtPayload };

export function supabaseUrl() {
    return (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/^"/, '').replace(/"$/, '').trim();
}

export function supabaseAnonKey() {
    return (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').replace(/^"/, '').replace(/"$/, '').trim();
}



/**
 * Read the authenticated user ID. Prefers the proxy-validated request header —
 * which is guaranteed present after proxy JWT validation — and falls back to
 * decoding the `taj_token` cookie for direct (non-proxy) requests.
 */
export async function getAuthUserId(): Promise<string | null> {
    const headerStore = await headers();
    const forwardedId = headerStore.get(USER_ID_HEADER);
    if (forwardedId && UUID_RE.test(forwardedId)) return forwardedId;

    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = decodeJwtPayload(token);
    if (!payload || typeof payload.sub !== 'string' || !UUID_RE.test(payload.sub)) return null;

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
