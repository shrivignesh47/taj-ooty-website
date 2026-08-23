import { NextResponse } from 'next/server'
import { existsSync, readFileSync } from 'fs'
import path from 'path'

const INSTALL_DIR = process.env.INSTALL_DIR || 'C:\\Program Files\\TajPOS'

export async function GET() {
  const configPath = path.join(INSTALL_DIR, 'config.json')

  if (!existsSync(configPath)) {
    return NextResponse.json({ complete: false, reason: 'config not found' })
  }

  try {
    const config = JSON.parse(readFileSync(configPath, 'utf8'))
    return NextResponse.json({
      complete: config.setupComplete === true,
      restaurantName: config.restaurantName || '',
    })
  } catch {
    return NextResponse.json({ complete: false, reason: 'config parse error' })
  }
}