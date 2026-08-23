'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

type WizardData = {
  restaurantName: string
  ownerName: string
  ownerPhone: string
  address: string
  gstNumber: string
  logoFile: File | null
  logoPreview: string
  adminEmail: string
  adminPassword: string
  adminConfirmPassword: string
  printerName: string
  googleConnected: boolean
  tunnelConnected: boolean
  tunnelUrl: string
}

const STEPS = [
  { id: 0, title: 'Welcome to Taj POS', subtitle: 'Let\u2019s set up your system' },
  { id: 1, title: 'Restaurant Details', subtitle: 'Tell us about your restaurant' },
  { id: 2, title: 'Upload Logo', subtitle: 'Add your restaurant branding' },
  { id: 3, title: 'Admin Account', subtitle: 'Create your manager login' },
  { id: 4, title: 'Printer Setup', subtitle: 'Connect your thermal printer' },
  { id: 5, title: 'Google Drive Backup', subtitle: 'Protect your data automatically' },
  { id: 6, title: 'Customer Ordering', subtitle: 'Enable QR code ordering' },
  { id: 7, title: 'All Done!', subtitle: 'Your system is ready' },
]

export default function SetupWizard() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const logoInputRef = useRef<HTMLInputElement>(null)

  const [data, setData] = useState<WizardData>({
    restaurantName: '',
    ownerName: '',
    ownerPhone: '',
    address: '',
    gstNumber: '',
    logoFile: null,
    logoPreview: '',
    adminEmail: '',
    adminPassword: '',
    adminConfirmPassword: '',
    printerName: '',
    googleConnected: false,
    tunnelConnected: false,
    tunnelUrl: '',
  })

  const set = (fields: Partial<WizardData>) => {
    setData(d => ({ ...d, ...fields }))
    setError('')
  }

  const validate = (): boolean => {
    if (step === 1) {
      if (!data.restaurantName.trim()) { setError('Restaurant name is required'); return false }
      if (!data.ownerName.trim()) { setError('Owner name is required'); return false }
    }
    if (step === 3) {
      if (!data.adminEmail.trim()) { setError('Email is required'); return false }
      if (!data.adminEmail.includes('@')) { setError('Enter a valid email'); return false }
      if (data.adminPassword.length < 8) { setError('Password must be at least 8 characters'); return false }
      if (data.adminPassword !== data.adminConfirmPassword) { setError('Passwords do not match'); return false }
    }
    return true
  }

  const handleNext = async () => {
    if (!validate()) return
    setError('')
    if (step === 6) { await handleFinish(); return }
    setStep(s => s + 1)
  }

  const handleFinish = async () => {
    setLoading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('restaurantName', data.restaurantName)
      formData.append('ownerName', data.ownerName)
      formData.append('ownerPhone', data.ownerPhone)
      formData.append('address', data.address)
      formData.append('gstNumber', data.gstNumber)
      formData.append('adminEmail', data.adminEmail)
      formData.append('adminPassword', data.adminPassword)
      formData.append('printerName', data.printerName)
      if (data.logoFile) formData.append('logo', data.logoFile)

      const res = await fetch('/api/setup/complete', { method: 'POST', body: formData })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || 'Setup failed. Please try again.')
        return
      }
      setStep(7)
    } catch {
      setError('Setup failed. Check that all services are running.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    set({ logoFile: file, logoPreview: URL.createObjectURL(file) })
  }

  const handleGoogleDrive = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/setup/google-drive-auth')
      const { url } = await res.json()
      const popup = window.open(url, 'google-auth', 'width=520,height=620')
      const poll = setInterval(async () => {
        try {
          const check = await fetch('/api/setup/google-drive-status')
          const { connected } = await check.json()
          if (connected) { set({ googleConnected: true }); clearInterval(poll); popup?.close() }
        } catch { /* keep polling */ }
      }, 2000)
      setTimeout(() => clearInterval(poll), 180000)
    } catch {
      setError('Google Drive setup failed. You can configure this later.')
    } finally {
      setLoading(false)
    }
  }

  const handleTunnel = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/setup/tunnel', { method: 'POST' })
      const { url, error: tunnelError } = await res.json()
      if (tunnelError) { setError(tunnelError); return }
      set({ tunnelConnected: true, tunnelUrl: url })
    } catch {
      setError('Tunnel setup failed. You can configure this later.')
    } finally {
      setLoading(false)
    }
  }

  const progress = ((step + 1) / STEPS.length) * 100
  const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4E1414] focus:ring-1 focus:ring-[#4E1414] placeholder:text-gray-400 bg-white transition-colors'
  const primaryBtn = 'w-full bg-[#4E1414] text-white rounded-xl py-3 text-sm font-medium hover:bg-[#350C0C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  const skipBtn = 'w-full text-sm text-gray-400 py-2 hover:text-gray-600 transition-colors'

  return (
    <div className="min-h-screen bg-[#F6EEDF] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="h-1 bg-gray-100">
          <div className="h-full bg-[#4E1414] transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>

        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Step {step + 1} of {STEPS.length}</p>
              <h1 className="text-xl font-semibold text-[#4E1414] mt-1">{STEPS[step].title}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{STEPS[step].subtitle}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#F6EEDF] flex items-center justify-center text-2xl flex-shrink-0">
              {['\uD83D\uDC4B', '\uD83C\uDFEA', '\uD83D\uDDBC\uFE0F', '\uD83D\uDD10', '\uD83D\uDDA8\uFE0F', '\u2601\uFE0F', '\uD83D\uDCF1', '\uD83C\uDF89'][step]}
            </div>
          </div>

          {step === 0 && (
            <div className="space-y-4">
              <div className="bg-[#F6EEDF] rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-3"><span className="text-[#C9974A]">&#10003;</span><p className="text-sm text-gray-700">PostgreSQL database running locally</p></div>
                <div className="flex items-center gap-3"><span className="text-[#C9974A]">&#10003;</span><p className="text-sm text-gray-700">Next.js app running as Windows service</p></div>
                <div className="flex items-center gap-3"><span className="text-[#C9974A]">&#10003;</span><p className="text-sm text-gray-700">All data stored locally on this PC</p></div>
                <div className="flex items-center gap-3"><span className="text-[#C9974A]">&#10003;</span><p className="text-sm text-gray-700">Works without internet (except backups)</p></div>
              </div>
              <p className="text-xs text-gray-400 text-center">This setup takes about 3 minutes</p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <input className={inputCls} placeholder="Restaurant name *" value={data.restaurantName} onChange={e => set({ restaurantName: e.target.value })} />
              <input className={inputCls} placeholder="Owner / Manager name *" value={data.ownerName} onChange={e => set({ ownerName: e.target.value })} />
              <input className={inputCls} placeholder="Phone number" type="tel" value={data.ownerPhone} onChange={e => set({ ownerPhone: e.target.value })} />
              <input className={inputCls} placeholder="Address" value={data.address} onChange={e => set({ address: e.target.value })} />
              <input className={inputCls} placeholder="GST number (optional)" value={data.gstNumber} onChange={e => set({ gstNumber: e.target.value })} />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div onClick={() => logoInputRef.current?.click()} className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-[#4E1414] hover:bg-[#F6EEDF] transition-all">
                {data.logoPreview ? (
                  <div className="space-y-2">
                    <img src={data.logoPreview} alt="Logo preview" className="w-24 h-24 object-contain mx-auto rounded-xl" />
                    <p className="text-sm text-gray-500">{data.logoFile?.name}</p>
                    <p className="text-xs text-[#4E1414]">Click to change</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Click to upload logo</p>
                    <p className="text-xs text-gray-400">PNG or JPG, recommended 512x512px</p>
                  </div>
                )}
              </div>
              <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={handleLogoSelect} />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">This is the main admin login for this restaurant.</p>
              <input className={inputCls} placeholder="Admin email *" type="email" value={data.adminEmail} onChange={e => set({ adminEmail: e.target.value })} />
              <input className={inputCls} placeholder="Password (min 8 characters) *" type="password" value={data.adminPassword} onChange={e => set({ adminPassword: e.target.value })} />
              <input className={inputCls} placeholder="Confirm password *" type="password" value={data.adminConfirmPassword} onChange={e => set({ adminConfirmPassword: e.target.value })} />
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs text-amber-700">Save these credentials safely. You will use them to log into the admin panel.</p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Enter your thermal printer name from Windows Settings. You can skip and configure later.</p>
              <input className={inputCls} placeholder="e.g. EPSON TM-T82, TVS RP45" value={data.printerName} onChange={e => set({ printerName: e.target.value })} />
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-xs text-blue-700">To find printer name: Windows Settings &rarr; Bluetooth & devices &rarr; Printers & scanners</p>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Your data will be automatically backed up to your Google Drive every hour. No data is sent to us.</p>
              {data.googleConnected ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
                  <span className="text-green-600 text-xl mt-0.5">&#10003;</span>
                  <div>
                    <p className="text-sm font-medium text-green-700">Google Drive connected</p>
                    <p className="text-xs text-green-600 mt-1">Backups run every hour automatically.</p>
                  </div>
                </div>
              ) : (
                <button onClick={handleGoogleDrive} disabled={loading} className={primaryBtn}>
                  {loading ? 'Opening Google login...' : 'Connect Google Drive'}
                </button>
              )}
              <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                <p className="text-xs text-gray-500 font-medium">What gets backed up:</p>
                <p className="text-xs text-gray-400">&bull; All orders and bills (hourly)</p>
                <p className="text-xs text-gray-400">&bull; Customer loyalty points (hourly)</p>
                <p className="text-xs text-gray-400">&bull; Full database dump (nightly at 11 PM)</p>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Allows customers to scan QR codes and order from their phone &mdash; even on mobile data. Free, automatic, secure via Cloudflare.</p>
              {data.tunnelConnected ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
                  <p className="text-sm font-medium text-green-700">&#10003; Customer ordering active</p>
                  <p className="text-xs text-green-600 font-mono break-all">{data.tunnelUrl}</p>
                </div>
              ) : (
                <button onClick={handleTunnel} disabled={loading} className={primaryBtn}>
                  {loading ? 'Setting up tunnel...' : 'Enable Customer Ordering'}
                </button>
              )}
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Requires internet for initial setup. Your POS and kitchen systems work without internet.</p>
              </div>
            </div>
          )}

          {step === 7 && (
            <div className="space-y-4 text-center">
              <p className="text-5xl mb-4">&#127881;</p>
              <p className="text-gray-700 font-medium">{data.restaurantName || 'Your restaurant'} is ready!</p>
              <div className="text-left bg-[#F6EEDF] rounded-xl p-4 space-y-2">
                <p className="text-sm text-gray-600">&#10003; Restaurant configured</p>
                <p className="text-sm text-gray-600">&#10003; Admin account created</p>
                {data.printerName && <p className="text-sm text-gray-600">&#10003; Printer: {data.printerName}</p>}
                {data.googleConnected && <p className="text-sm text-gray-600">&#10003; Google Drive backup active</p>}
                {data.tunnelConnected && <p className="text-sm text-gray-600">&#10003; Customer ordering active</p>}
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs text-amber-700 font-medium">Your login:</p>
                <p className="text-xs text-amber-600 font-mono mt-1">{data.adminEmail}</p>
              </div>
              <button onClick={() => router.replace('/staff/login')} className={primaryBtn}>Open Taj POS &rarr;</button>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {step < 7 && (
            <div className="mt-6 space-y-2">
              {step !== 5 && step !== 6 && (
                <button onClick={handleNext} disabled={loading} className={primaryBtn}>
                  {loading ? 'Please wait...' : 'Continue \u2192'}
                </button>
              )}
              {step === 2 && <button onClick={() => setStep(3)} className={skipBtn}>Skip &mdash; add logo later</button>}
              {step === 4 && (
                <>
                  <button onClick={handleNext} disabled={loading} className={primaryBtn}>Save & Continue &rarr;</button>
                  <button onClick={() => setStep(5)} className={skipBtn}>Skip &mdash; configure printer later</button>
                </>
              )}
              {step === 5 && (
                <>
                  {data.googleConnected && <button onClick={() => setStep(6)} className={primaryBtn}>Continue &rarr;</button>}
                  <button onClick={() => setStep(6)} className={skipBtn}>Skip &mdash; set up backup later</button>
                </>
              )}
              {step === 6 && (
                <>
                  {data.tunnelConnected && (
                    <button onClick={handleFinish} disabled={loading} className={primaryBtn}>{loading ? 'Saving...' : 'Finish Setup \u2192'}</button>
                  )}
                  <button onClick={handleFinish} disabled={loading} className={skipBtn}>{loading ? 'Saving...' : 'Skip &mdash; enable customer ordering later'}</button>
                </>
              )}
              {step > 0 && step < 7 && (
                <button onClick={() => { setStep(s => s - 1); setError('') }} className="w-full text-xs text-gray-300 py-1 hover:text-gray-500 transition-colors">&larr; Back</button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}