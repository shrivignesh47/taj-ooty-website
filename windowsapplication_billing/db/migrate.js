/**
 * TajPOS Database Migration Runner
 * Runs init.sql + seed.sql on local PostgreSQL
 * Usage: node migrate.js
 * Usage (reset): node migrate.js --reset
 */

const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

const DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  user: 'tajpos',
  password: 'tajpos',
  database: 'tajpos',
}

const POSTGRES_CONFIG = {
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'postgres',
}

async function createDatabase() {
  const client = new Client(POSTGRES_CONFIG)
  try {
    await client.connect()
    
    // Create user if not exists
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'tajpos') THEN
          CREATE USER tajpos WITH PASSWORD 'tajpos';
        END IF;
      END $$;
    `)
    
    // Create database if not exists
    const dbExists = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = 'tajpos'`
    )
    
    if (dbExists.rows.length === 0) {
      await client.query(`CREATE DATABASE tajpos OWNER tajpos`)
      console.log('✓ Database created')
    } else {
      console.log('✓ Database already exists')
    }
    
    // Grant privileges
    await client.query(`GRANT ALL PRIVILEGES ON DATABASE tajpos TO tajpos`)
    
  } finally {
    await client.end()
  }
}

async function runMigration(reset = false) {
  console.log('\n=============================')
  console.log('  TajPOS Database Migration  ')
  console.log('=============================\n')

  // Step 1: Create database
  console.log('Step 1: Creating database...')
  await createDatabase()

  // Step 2: Connect to tajpos database
  const client = new Client(DB_CONFIG)
  await client.connect()
  console.log('✓ Connected to tajpos database')

  try {
    if (reset) {
      console.log('\n⚠️  RESET MODE: Dropping all tables...')
      await client.query(`
        DROP SCHEMA public CASCADE;
        CREATE SCHEMA public;
        GRANT ALL ON SCHEMA public TO tajpos;
        GRANT ALL ON SCHEMA public TO public;
      `)
      console.log('✓ Schema reset')
    }

    // Step 3: Run init.sql
    console.log('\nStep 2: Creating schema...')
    const initSql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8')
    await client.query(initSql)
    console.log('✓ Schema created')

    // Step 4: Run seed.sql
    console.log('\nStep 3: Inserting seed data...')
    const seedSql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8')
    await client.query(seedSql)
    console.log('✓ Seed data inserted')

    // Step 5: Verify
    console.log('\nStep 4: Verifying...')
    const tables = await client.query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `)
    const menuItems = await client.query(`SELECT COUNT(*) as count FROM menu_items`)
    const categories = await client.query(`SELECT COUNT(*) as count FROM categories`)
    const tables2 = await client.query(`SELECT COUNT(*) as count FROM restaurant_tables`)
    const users = await client.query(`SELECT COUNT(*) as count FROM app_users`)

    console.log(`✓ Tables created: ${tables.rows[0].count}`)
    console.log(`✓ Menu items: ${menuItems.rows[0].count}`)
    console.log(`✓ Categories: ${categories.rows[0].count}`)
    console.log(`✓ Restaurant tables: ${tables2.rows[0].count}`)
    console.log(`✓ App users: ${users.rows[0].count}`)

    console.log('\n✅ Migration complete!\n')
    console.log('Default login credentials:')
    console.log('  Admin:   admin@tajpos.local   / Admin@123')
    console.log('  Waiter:  waiter@tajpos.local  / Waiter@123')
    console.log('  Kitchen: kitchen@tajpos.local / Kitchen@123')
    console.log('  Cashier: cashier@tajpos.local / Cashier@123')
    console.log('\nChange these during Setup Wizard.\n')

  } catch (err) {
    console.error('\n❌ Migration failed:', err.message)
    console.error('\nFull error:', err)
    process.exit(1)
  } finally {
    await client.end()
  }
}

const reset = process.argv.includes('--reset')
if (reset) {
  console.log('\n⚠️  WARNING: This will delete all data. Are you sure?')
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n')
  setTimeout(() => runMigration(true), 5000)
} else {
  runMigration(false)
}