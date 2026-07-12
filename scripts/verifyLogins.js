global.WebSocket = require('ws');
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const accounts = [
  { role: 'Admin', email: 'admin@taj.com', password: 'password123' },
  { role: 'Waiter', email: 'waiter@taj.com', password: 'password123' },
  { role: 'Kitchen', email: 'kitchen@taj.com', password: 'password123' },
  { role: 'Cashier', email: 'cashier@taj.com', password: 'password123' },
  { role: 'Admin', email: 'admin@tajooty.com', password: 'Admin@123' },
  { role: 'Waiter', email: 'waiter@tajooty.com', password: 'Waiter@123' },
  { role: 'Kitchen', email: 'kitchen@tajooty.com', password: 'Kitchen@123' },
  { role: 'Cashier', email: 'cashier@tajooty.com', password: 'Cashier@123' }
];

async function verifyAll() {
  console.log("=================================================");
  console.log("  VERIFYING ALL STAFF CREDENTIALS (BOTH DOMAINS) ");
  console.log("=================================================");
  for (const acc of accounts) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: acc.email,
      password: acc.password
    });
    if (error) {
      console.error(`[FAIL] ${acc.role} (${acc.email}): ${error.message}`);
    } else {
      const { data: staffData } = await supabase
        .from('staff_users')
        .select('name, roles(name)')
        .eq('auth_id', data.user.id)
        .single();
      console.log(`[PASS] Role: ${acc.role.padEnd(8)} | Email: ${acc.email.padEnd(20)} | Password: ${acc.password.padEnd(12)} | Staff Name: ${(staffData ? staffData.name : 'N/A').padEnd(24)} | DB Role: ${staffData?.roles ? staffData.roles.name : 'N/A'}`);
    }
  }
}

verifyAll();
