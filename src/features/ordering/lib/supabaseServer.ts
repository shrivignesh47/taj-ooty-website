import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

const BASE64_PREFIX = 'base64-';
const MAX_CHUNK_SIZE = 3180;

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

function stringToBase64URL(str: string): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const bytes = new TextEncoder().encode(str);
    let result = '';
    let queue = 0;
    let queuedBits = 0;
    for (const byte of bytes) {
        queue = (queue << 8) | byte;
        queuedBits += 8;
        while (queuedBits >= 6) {
            result += chars[(queue >> (queuedBits - 6)) & 63];
            queuedBits -= 6;
        }
    }
    if (queuedBits > 0) {
        result += chars[(queue << (6 - queuedBits)) & 63];
    }
    return result;
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
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options });
                    } catch {
                        // The `set` function is called silently if called from a Server Component.
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options });
                    } catch {
                        // Un-set safely
                    }
                },
            },
        }
    );
}

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
