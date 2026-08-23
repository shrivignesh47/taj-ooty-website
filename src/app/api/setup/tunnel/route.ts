import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import path from 'path'

const INSTALL_DIR = process.env.INSTALL_DIR || 'C:\\Program Files\\TajPOS'

export async function POST() {
  const cloudflared = path.join(INSTALL_DIR, 'cloudflared.exe')

  return new Promise<NextResponse>(resolve => {
    const proc = exec(
      `"${cloudflared}" tunnel --url http://localhost:3000 --no-autoupdate`,
      { timeout: 20000 }
    )

    let output = ''

    proc.stderr?.on('data', (data: string) => {
      output += data
      const match = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)
      if (match) {
        resolve(NextResponse.json({ url: match[0] }))
      }
    })

    proc.on('error', () => {
      resolve(NextResponse.json({
        url: 'http://localhost:3000',
        error: 'Cloudflare tunnel not available. Customer ordering will work on local WiFi only.'
      }))
    })

    setTimeout(() => {
      resolve(NextResponse.json({
        url: 'http://localhost:3000',
        error: 'Tunnel timeout. Configure manually later in Admin settings.'
      }))
    }, 18000)
  })
}