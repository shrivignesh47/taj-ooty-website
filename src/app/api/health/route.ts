import { NextResponse } from 'next/server'
import { Client } from 'pg'

const DB_URL =
  process.env.DATABASE_URL || 'postgresql://tajpos:tajpos@localhost:5432/tajpos'

export async function GET() {
  const client = new Client({ connectionString: DB_URL })

  try {
    await client.connect()
    await client.query('SELECT 1')
    await client.end()

    return NextResponse.json({
      status: 'ok',
      db: 'connected',
      mode: process.env.NEXT_PUBLIC_AUTH_MODE || 'cloud',
      timestamp: new Date().toISOString(),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'DB error'
    return NextResponse.json(
      { status: 'error', db: 'disconnected', error: message },
      { status: 503 }
    )
  }
}