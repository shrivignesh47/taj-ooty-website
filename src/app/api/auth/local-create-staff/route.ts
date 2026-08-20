/**
 * Create a new staff user (local Windows mode)
 * Admin only
 */
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { Client } from 'pg'

const DB_URL =
  process.env.DATABASE_URL || 'postgresql://tajpos:tajpos@localhost:5432/tajpos'

export async function POST(req: NextRequest) {
  // Check admin session
  const cookieStore = await cookies()
  const cookie = cookieStore.get('tajpos_local_session')
  if (!cookie) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const session = JSON.parse(cookie.value)
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { name, email, password, roleName, phone } = await req.json()

  if (!name || !email || !password || !roleName) {
    return NextResponse.json({ error: 'All fields required' }, { status: 400 })
  }

  const client = new Client({ connectionString: DB_URL })

  try {
    await client.connect()

    // Get role id
    const roleRes = await client.query(
      `SELECT id FROM roles WHERE name = $1`,
      [roleName]
    )

    if (roleRes.rows.length === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 400 })
    }

    const roleId = roleRes.rows[0].id
    const staffId = crypto.randomUUID()
    const userId = crypto.randomUUID()

    // Create staff_user
    await client.query(
      `INSERT INTO staff_users (id, auth_id, name, phone, role_id, is_active)
       VALUES ($1, $1, $2, $3, $4, true)`,
      [staffId, name, phone || '', roleId]
    )

    // Create app_user
    await client.query(
      `INSERT INTO app_users (id, email, password_hash, staff_id, is_active)
       VALUES ($1, $2, crypt($3, gen_salt('bf')), $4, true)`,
      [userId, email, password, staffId]
    )

    return NextResponse.json({ success: true, staffId })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error'
    if (message.includes('unique')) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: message }, { status: 500 })
  } finally {
    await client.end()
  }
}