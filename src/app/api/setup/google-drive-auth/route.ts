import { NextResponse } from 'next/server'

const SCOPES = ['https://www.googleapis.com/auth/drive.file']
const REDIRECT_URI = 'http://localhost:3000/api/setup/google-drive-callback'

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID

  if (!clientId) {
    return NextResponse.json(
      { error: 'Google OAuth not configured. Add GOOGLE_CLIENT_ID to .env.local' },
      { status: 500 }
    )
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
  })

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  return NextResponse.json({ url })
}