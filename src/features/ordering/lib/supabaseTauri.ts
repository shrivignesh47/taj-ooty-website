import { createClient } from '@supabase/supabase-js'
import { getBusinessConfig, isTauri } from './tauriClient'

let _client: ReturnType<typeof createClient> | null = null

export async function getSupabaseTauriClient() {
  if (!isTauri()) {
    const { createBrowserClient } = await import('@supabase/ssr')
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/^"/, '').replace(/"$/, '').trim();
    const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').replace(/^"/, '').replace(/"$/, '').trim();
    return createBrowserClient(
      supabaseUrl,
      supabaseAnonKey
    )
  }
  if (_client) return _client
  const config = await getBusinessConfig()
  if (!config) throw new Error('Business not configured. Please activate first.')
  _client = createClient(config.supabase_url, config.supabase_anon_key)
  return _client
}
