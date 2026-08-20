import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { Client } from 'pg'

const DB_URL =
  process.env.DATABASE_URL || 'postgresql://tajpos:tajpos@localhost:5432/tajpos'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const cookie = cookieStore.get('tajpos_local_session')
  if (!cookie) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const session = JSON.parse(cookie.value)
  const { currentPassword, newPassword } = await req.json()

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Both passwords required' }, { status: 400 })
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: 'New password must be at least 8 characters' },
      { status: 400 }
    )
  }

  const client = new Client({ connectionString: DB_URL })

  try {
    await client.connect()

    // Verify current password
    const check = await client.query(
      `SELECT id FROM app_users
       WHERE id = $1 AND password_hash = crypt($2, password_hash)`,
      [session.id, currentPassword]
    )

    if (check.rows.length === 0) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      )
    }

    // Update password
    await client.query(
      `UPDATE app_users
       SET password_hash = crypt($1, gen_salt('bf'))
       WHERE id = $2`,
      [newPassword, session.id]
    )

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: message }, { status: 500 })
  } finally {
    await client.end()
  }
}