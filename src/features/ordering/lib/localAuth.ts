/**
 * Local Auth Adapter
 * Used only in Windows local mode (NEXT_PUBLIC_AUTH_MODE=local)
 * Falls back to Supabase Auth in web/cloud mode
 */

export const isLocalMode = (): boolean => {
  return process.env.NEXT_PUBLIC_AUTH_MODE === 'local'
}

export type LocalSession = {
  id: string
  email: string
  staffId: string
  name: string
  role: string
}

export async function localSignIn(
  email: string,
  password: string
): Promise<{ session: LocalSession | null; error: string | null }> {
  try {
    const res = await fetch('/api/auth/local-signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) return { session: null, error: data.error || 'Login failed' }
    return { session: data.session, error: null }
  } catch {
    return { session: null, error: 'Cannot connect to local server' }
  }
}

export async function localSignOut(): Promise<void> {
  await fetch('/api/auth/local-signout', { method: 'POST' })
}

export async function getLocalSession(): Promise<LocalSession | null> {
  try {
    const res = await fetch('/api/auth/local-session')
    if (!res.ok) return null
    const data = await res.json()
    return data.session || null
  } catch {
    return null
  }
}