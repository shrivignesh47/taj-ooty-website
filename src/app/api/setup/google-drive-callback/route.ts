import { NextRequest, NextResponse } from 'next/server'
import { writeFileSync } from 'fs'
import path from 'path'

const INSTALL_DIR = process.env.INSTALL_DIR || 'C:\\Program Files\\TajPOS'
const REDIRECT_URI = 'http://localhost:3000/api/setup/google-drive-callback'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const error = req.nextUrl.searchParams.get('error')

  if (error || !code) {
    return new NextResponse(
      `<html><body><p style="font-family:sans-serif;padding:2rem;color:#c00">
        Google Drive connection failed: ${error || 'No code received'}
        <br><br><button onclick="window.close()">Close</button>
      </p></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })

    const tokens = await tokenRes.json()

    if (tokens.error) throw new Error(tokens.error_description || tokens.error)

    writeFileSync(
      path.join(INSTALL_DIR, 'google-credentials.json'),
      JSON.stringify(tokens, null, 2)
    )

    return new NextResponse(
      `<html><body><p style="font-family:sans-serif;padding:2rem;color:#1D9E75;font-size:1.1rem">
        ✓ Google Drive connected successfully!
        <br><br>
        <span style="font-size:0.9rem;color:#555">You can close this window.</span>
        <script>setTimeout(() => window.close(), 2000)</script>
      </p></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return new NextResponse(
      `<html><body><p style="font-family:sans-serif;padding:2rem;color:#c00">
        Failed: ${msg}
        <br><br><button onclick="window.close()">Close</button>
      </p></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  }
}