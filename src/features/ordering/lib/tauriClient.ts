export const isTauri = (): boolean =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

export type BusinessConfig = {
  restaurant_name: string
  supabase_url: string
  supabase_anon_key: string
  license_key: string
  license_type: 'direct' | 'whitelabel'
  license_expires: string
  logo_path?: string
  primary_color?: string
}

export async function getBusinessConfig(): Promise<BusinessConfig | null> {
  if (!isTauri()) return null
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<BusinessConfig | null>('get_business_config')
}

export async function setBusinessConfig(config: BusinessConfig): Promise<void> {
  if (!isTauri()) return
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke('set_business_config', { config })
}

export async function validateLicense(licenseKey: string): Promise<boolean> {
  if (!isTauri()) return true
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<boolean>('validate_license', { licenseKey })
}

export async function getAppVersion(): Promise<string> {
  if (!isTauri()) return 'web'
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<string>('get_app_version')
}

export async function checkForUpdates(): Promise<void> {
  if (!isTauri()) return
  const { check } = await import('@tauri-apps/plugin-updater')
  const update = await check()
  if (update?.available) {
    await update.downloadAndInstall()
  }
}
