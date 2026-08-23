import { NextResponse } from 'next/server'
import { existsSync } from 'fs'
import path from 'path'

const INSTALL_DIR = process.env.INSTALL_DIR || 'C:\\Program Files\\TajPOS'

export async function GET() {
  const connected = existsSync(path.join(INSTALL_DIR, 'google-credentials.json'))
  return NextResponse.json({ connected })
}