/**
 * TajPOS Backup Restore Script
 * Restores data from a Google Drive backup Excel file
 * Usage: node restore.js --file "path/to/backup.xlsx"
 * Usage: node restore.js --date "2026-08-20" (downloads from Google Drive)
 */

const { Client } = require('pg')
const fs = require('fs')
const path = require('path')
const XLSX = require('xlsx')

const DB_URL = process.env.DATABASE_URL || 'postgresql://tajpos:tajpos@localhost:5432/tajpos'
const INSTALL_DIR = process.env.INSTALL_DIR || 'C:\\Program Files\\TajPOS'
const BACKUP_DIR = path.join(INSTALL_DIR, 'backups')

async function restoreFromFile(filePath) {
  console.log('\n=============================')
  console.log('    TajPOS Backup Restore    ')
  console.log('=============================\n')

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Backup file not found: ${filePath}`)
    process.exit(1)
  }

  console.log(`Restoring from: ${filePath}`)
  const workbook = XLSX.readFile(filePath)
  const client = new Client({ connectionString: DB_URL })

  try {
    await client.connect()
    console.log('✓ Connected to database')

    await client.query('BEGIN')

    // Restore orders
    if (workbook.SheetNames.includes('Orders')) {
      const sheet = XLSX.utils.sheet_to_json(workbook.Sheets['Orders'])
      console.log(`Restoring ${sheet.length} orders...`)
      for (const row of sheet) {
        await client.query(
          `INSERT INTO orders (id, table_id, customer_name, customer_phone, status, waiter_id, created_at, token_no, source)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (id) DO NOTHING`,
          [row.id, row.table_id, row.customer_name, row.customer_phone,
           row.status, row.waiter_id, row.created_at, row.token_no, row.source]
        )
      }
      console.log(`✓ Orders restored`)
    }

    // Restore order items
    if (workbook.SheetNames.includes('Order Items')) {
      const sheet = XLSX.utils.sheet_to_json(workbook.Sheets['Order Items'])
      console.log(`Restoring ${sheet.length} order items...`)
      for (const row of sheet) {
        await client.query(
          `INSERT INTO order_items (id, order_id, menu_item_id, qty, notes, price_at_order, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (id) DO NOTHING`,
          [row.id, row.order_id, row.menu_item_id, row.qty,
           row.notes, row.price_at_order, row.status]
        )
      }
      console.log(`✓ Order items restored`)
    }

    // Restore bills
    if (workbook.SheetNames.includes('Bills')) {
      const sheet = XLSX.utils.sheet_to_json(workbook.Sheets['Bills'])
      console.log(`Restoring ${sheet.length} bills...`)
      for (const row of sheet) {
        await client.query(
          `INSERT INTO bills (id, order_id, total, cashier_id, paid_at, payment_method)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (id) DO NOTHING`,
          [row.id, row.order_id, row.total, row.cashier_id, row.paid_at, row.payment_method]
        )
      }
      console.log(`✓ Bills restored`)
    }

    // Restore loyalty points
    if (workbook.SheetNames.includes('Loyalty')) {
      const sheet = XLSX.utils.sheet_to_json(workbook.Sheets['Loyalty'])
      console.log(`Restoring ${sheet.length} loyalty records...`)
      for (const row of sheet) {
        await client.query(
          `INSERT INTO customer_loyalty (customer_phone, customer_name, points_balance, lifetime_points_earned, lifetime_visits)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (customer_phone) DO UPDATE SET
             points_balance = EXCLUDED.points_balance,
             lifetime_points_earned = EXCLUDED.lifetime_points_earned,
             lifetime_visits = EXCLUDED.lifetime_visits`,
          [row.customer_phone, row.customer_name, row.points_balance,
           row.lifetime_points_earned, row.lifetime_visits]
        )
      }
      console.log(`✓ Loyalty points restored`)
    }

    await client.query('COMMIT')
    console.log('\n✅ Restore complete!\n')

  } catch (err) {
    await client.query('ROLLBACK')
    console.error('\n❌ Restore failed:', err.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

async function restoreFromGoogleDrive(date) {
  console.log(`Downloading backup for ${date} from Google Drive...`)
  
  const credsPath = path.join(INSTALL_DIR, 'google-credentials.json')
  if (!fs.existsSync(credsPath)) {
    console.error('❌ Google Drive not configured. Use --file instead.')
    process.exit(1)
  }

  const { google } = require('googleapis')
  const creds = JSON.parse(fs.readFileSync(credsPath))
  const auth = new google.auth.OAuth2()
  auth.setCredentials(creds)
  const drive = google.drive({ version: 'v3', auth })

  // Search for backup file
  const res = await drive.files.list({
    q: `name contains 'tajpos-backup-${date}' and trashed = false`,
    fields: 'files(id, name)'
  })

  if (res.data.files.length === 0) {
    console.error(`❌ No backup found for date: ${date}`)
    process.exit(1)
  }

  const file = res.data.files[0]
  console.log(`Found: ${file.name}`)

  // Download file
  const destPath = path.join(BACKUP_DIR, file.name)
  const dest = fs.createWriteStream(destPath)

  const download = await drive.files.get(
    { fileId: file.id, alt: 'media' },
    { responseType: 'stream' }
  )

  await new Promise((resolve, reject) => {
    download.data.pipe(dest)
    dest.on('finish', resolve)
    dest.on('error', reject)
  })

  console.log(`✓ Downloaded to: ${destPath}`)
  await restoreFromFile(destPath)
}

// Parse arguments
const args = process.argv.slice(2)
const fileArg = args.find(a => a.startsWith('--file='))
const dateArg = args.find(a => a.startsWith('--date='))

if (fileArg) {
  restoreFromFile(fileArg.split('=')[1])
} else if (dateArg) {
  restoreFromGoogleDrive(dateArg.split('=')[1])
} else {
  // List available local backups
  console.log('\nAvailable local backups:')
  if (fs.existsSync(BACKUP_DIR)) {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.xlsx'))
      .sort()
      .reverse()
    
    if (files.length === 0) {
      console.log('  No backups found')
    } else {
      files.forEach((f, i) => console.log(`  ${i + 1}. ${f}`))
      console.log(`\nUsage: node restore.js --file="${path.join(BACKUP_DIR, files[0])}"`)
    }
  }
  console.log('Usage: node restore.js --file="path/to/backup.xlsx"')
  console.log('Usage: node restore.js --date="2026-08-20"')
}