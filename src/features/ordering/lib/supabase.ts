import { createBrowserClient } from '@supabase/ssr';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseUrl = rawUrl.replace(/^"/, '').replace(/"$/, '').trim();
const supabaseAnonKey = rawAnonKey.replace(/^"/, '').replace(/"$/, '').trim();

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Check .env.local');
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
