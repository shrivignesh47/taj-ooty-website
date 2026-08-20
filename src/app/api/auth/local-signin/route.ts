import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { Client } from 'pg'

const DB_URL =
  process.env.DATABASE_URL || 'postgresql://tajpos:tajpos@localhost:5432/tajpos'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password required' },
      { status: 400 }
    )
  }

  const client = new Client({ connectionString: DB_URL })

  try {
    await client.connect()

    const result = await client.query(
      `SELECT
         au.id,
         au.email,
         au.staff_id,
         su.name,
         r.name AS role_name
       FROM app_users au
       JOIN staff_users su ON au.staff_id = su.id
       JOIN roles r ON su.role_id = r.id
       WHERE au.email = $1
         AND au.password_hash = crypt($2, au.password_hash)
         AND au.is_active = true
         AND su.is_active = true`,
      [email, password]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Update last login
    await client.query(
      `UPDATE app_users SET last_login = now() WHERE email = $1`,
      [email]
    )

    const user = result.rows[0]
    const session = {
      id: user.id,
      email: user.email,
      staffId: user.staff_id,
      name: user.name,
      role: user.role_name,
    }

    // Set session cookie (7 days)
    const cookieStore = await cookies()
    cookieStore.set('tajpos_local_session', JSON.stringify(session), {
      httpOnly: true,
      secure: false,
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
      sameSite: 'lax',
    })

    return NextResponse.json({ session })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Auth error'
    return NextResponse.json({ error: message }, { status: 500 })
  } finally {
    await client.end()
  }
}