import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  const cookie = cookieStore.get('tajpos_local_session')

  if (!cookie) return NextResponse.json({ session: null })

  try {
    const session = JSON.parse(cookie.value)
    return NextResponse.json({ session })
  } catch {
    return NextResponse.json({ session: null })
  }
}