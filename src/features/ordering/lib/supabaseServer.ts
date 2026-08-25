import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const BASE64_PREFIX = 'base64-';
const MAX_CHUNK_SIZE = 3180;

const TO_BASE64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function stringToBase64URL(str: string): string {
    const bytes = new TextEncoder().encode(str);
    let result = '';
    let queue = 0;
    let queuedBits = 0;
    for (const byte of bytes) {
        queue = (queue << 8) | byte;
        queuedBits += 8;
        while (queuedBits >= 6) {
            result += TO_BASE64URL[(queue >> (queuedBits - 6)) & 63];
            queuedBits -= 6;
        }
    }
    if (queuedBits > 0) {
        result += TO_BASE64URL[(queue << (6 - queuedBits)) & 63];
    }
    return result;
}

function createChunks(key: string, value: string): Array<{ name: string; value: string }> {
    const encoded = encodeURIComponent(value);
    if (encoded.length <= MAX_CHUNK_SIZE) {
        return [{ name: key, value }];
    }
    const chunks: Array<{ name: string; value: string }> = [];
    let remaining = encoded;
    let i = 0;
    while (remaining.length > 0) {
        let chunkHead = remaining.slice(0, MAX_CHUNK_SIZE);
        const lastEscape = chunkHead.lastIndexOf('%');
        if (lastEscape > MAX_CHUNK_SIZE - 3) {
            chunkHead = chunkHead.slice(0, lastEscape);
        }
        let decoded = '';
        while (chunkHead.length > 0) {
            try {
                decoded = decodeURIComponent(chunkHead);
                break;
            } catch (e) {
                if (e instanceof URIError && chunkHead.at(-3) === '%' && chunkHead.length > 3) {
                    chunkHead = chunkHead.slice(0, chunkHead.length - 3);
                } else {
                    throw e;
                }
            }
        }
        chunks.push({ name: `${key}.${i}`, value: decoded });
        remaining = remaining.slice(chunkHead.length);
        i++;
    }
    return chunks;
}

export async function createSupabaseServerClient() {
    const cookieStore = await cookies();
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/^"/, '').replace(/"$/, '').trim();
    const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').replace(/^"/, '').replace(/"$/, '').trim();

    return createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll().map(({ name, value }) => ({ name, value }));
                },
                setAll(cookiesToSet) {
                    try {
                        for (const { name, value, options } of cookiesToSet) {
                            cookieStore.set({ name, value, ...options });
                        }
                    } catch {
                        // Server Component — cookies() is read-only there
                    }
                },
            },
        }
    );
}

/**
 * Synchronously write the session into cookies so they are included in the
 * Server Action response.  The library's onAuthStateChange → applyServerStorage
 * flow is fire-and-forget and completes AFTER the response is sent, so without
 * this call the browser never receives the auth cookies.
 */
export async function persistSession(session: Record<string, unknown>) {
    const cookieStore = await cookies();
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/^"/, '').replace(/"$/, '').trim();
    const projectRef = supabaseUrl.match(/\/\/([^.]+)\./)?.[1] || '';
    const storageKey = `sb-${projectRef}-auth-token`;

    const sessionStr = JSON.stringify(session);
    const encoded = `${BASE64_PREFIX}${stringToBase64URL(sessionStr)}`;

    const chunks = createChunks(storageKey, encoded);
    for (const chunk of chunks) {
        cookieStore.set(chunk.name, chunk.value, {
            path: '/',
            sameSite: 'lax',
            httpOnly: false,
            maxAge: 400 * 24 * 60 * 60,
        });
    }
}
