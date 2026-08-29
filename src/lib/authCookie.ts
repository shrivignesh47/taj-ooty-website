// Pure auth-cookie helpers — no `next/headers` import so this file is safe to
// import from `proxy.ts` (which runs outside the Server-Component runtime).

export const COOKIE_NAME = 'taj_token';
export const COOKIE_MAX_AGE = 12 * 60 * 60; // 12 hours
export const USER_ID_HEADER = 'x-taj-user-id';

/**
 * Decode a JWT payload without any library. Returns null on failure.
 * Uses `atob` which is available in both Node.js 20+ and Edge runtimes.
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
