/**
 * Test local auth system
 * Usage: node test-auth.js
 * Run AFTER migrate.js
 */

const { Client } = require('pg')

const DB_URL = process.env.DATABASE_URL ||
  'postgresql://tajpos:tajpos@localhost:5432/tajpos'

async function testAuth() {
  console.log('\n=============================')
  console.log('   TajPOS Auth System Test   ')
  console.log('=============================\n')

  const client = new Client({ connectionString: DB_URL })
  await client.connect()

  const testUsers = [
    { email: 'admin@tajpos.local', password: 'Admin@123', role: 'admin' },
    { email: 'waiter@tajpos.local', password: 'Waiter@123', role: 'waiter' },
    { email: 'kitchen@tajpos.local', password: 'Kitchen@123', role: 'kitchen' },
    { email: 'cashier@tajpos.local', password: 'Cashier@123', role: 'cashier' },
  ]

  let passed = 0
  let failed = 0

  for (const user of testUsers) {
    const result = await client.query(
      `SELECT au.id, au.email, su.name, r.name AS role
       FROM app_users au
       JOIN staff_users su ON au.staff_id = su.id
       JOIN roles r ON su.role_id = r.id
       WHERE au.email = $1
         AND au.password_hash = crypt($2, au.password_hash)
         AND au.is_active = true`,
      [user.email, user.password]
    )

    if (result.rows.length > 0 && result.rows[0].role === user.role) {
      console.log(`✓ ${user.email} → ${result.rows[0].role}`)
      passed++
    } else {
      console.log(`❌ ${user.email} → FAILED`)
      failed++
    }
  }

  // Test wrong password
  const wrongPass = await client.query(
    `SELECT id FROM app_users
     WHERE email = 'admin@tajpos.local'
       AND password_hash = crypt('wrongpassword', password_hash)`,
    []
  )
  if (wrongPass.rows.length === 0) {
    console.log('✓ Wrong password correctly rejected')
    passed++
  } else {
    console.log('❌ Wrong password was accepted — SECURITY ISSUE')
    failed++
  }

  await client.end()

  console.log(`\nResults: ${passed} passed, ${failed} failed`)

  if (failed === 0) {
    console.log('\n✅ Auth system working correctly!\n')
    console.log('Next: Start Next.js (npm run dev) and test:')
    console.log('  POST http://localhost:3000/api/auth/local-signin')
    console.log('  GET  http://localhost:3000/api/health\n')
  } else {
    console.log('\n❌ Auth test failed. Re-run migrate.js first.\n')
    process.exit(1)
  }
}

testAuth().catch(err => {
  console.error('Test error:', err.message)
  process.exit(1)
})