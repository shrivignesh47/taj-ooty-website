import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import path from 'path'

const DB_URL =
  process.env.DATABASE_URL || 'postgresql://tajpos:tajpos@localhost:5432/tajpos'
const INSTALL_DIR =
  process.env.INSTALL_DIR || 'C:\\Program Files\\TajPOS'

export async function POST(req: NextRequest) {
  const formData = await req.formData()

  const restaurantName = formData.get('restaurantName') as string
  const ownerName = formData.get('ownerName') as string
  const ownerPhone = formData.get('ownerPhone') as string
  const address = formData.get('address') as string
  const gstNumber = formData.get('gstNumber') as string
  const adminEmail = formData.get('adminEmail') as string
  const adminPassword = formData.get('adminPassword') as string
  const printerName = formData.get('printerName') as string
  const logoFile = formData.get('logo') as File | null

  if (!restaurantName || !adminEmail || !adminPassword) {
    return NextResponse.json({ error: 'Required fields missing' }, { status: 400 })
  }

  const client = new Client({ connectionString: DB_URL })

  try {
    await client.connect()

    // Update restaurant settings
    await client.query(
      `UPDATE restaurant_settings SET
         restaurant_name = $1,
         gst_number = $2,
         phone = $3,
         address = $4,
         printer_name = COALESCE(NULLIF($5, ''), printer_name)
       WHERE id = (SELECT id FROM restaurant_settings LIMIT 1)`,
      [restaurantName, gstNumber || '', ownerPhone || '', address || '', printerName || '']
    )

    // Update admin user credentials
    await client.query(
      `UPDATE app_users SET
         email = $1,
         password_hash = crypt($2, gen_salt('bf'))
       WHERE id = '00000000-0000-0000-0000-000000000001'`,
      [adminEmail, adminPassword]
    )

    await client.query(
      `UPDATE staff_users SET name = $1
       WHERE id = '00000000-0000-0000-0000-000000000001'`,
      [ownerName || 'Admin']
    )

    await client.end()

    // Save logo file
    if (logoFile && logoFile.size > 0) {
      const logoDir = path.join(INSTALL_DIR, 'public')
      if (!existsSync(logoDir)) mkdirSync(logoDir, { recursive: true })
      const logoBytes = await logoFile.arrayBuffer()
      writeFileSync(path.join(logoDir, 'logo.png'), Buffer.from(logoBytes))
    }

    // Save config.json
    const configDir = INSTALL_DIR
    if (!existsSync(configDir)) mkdirSync(configDir, { recursive: true })

    const config = {
      restaurantName,
      ownerName,
      ownerPhone,
      address,
      gstNumber,
      adminEmail,
      printerName,
      setupComplete: true,
      setupDate: new Date().toISOString(),
    }

    writeFileSync(path.join(configDir, 'config.json'), JSON.stringify(config, null, 2))

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    try { await client.end() } catch { /* ignore */ }
    const message = err instanceof Error ? err.message : 'Setup failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}