const { Client } = require('pg');
const fs = require('fs');

async function run() {
  const client = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' });
  await client.connect();

  const tablesRes = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
  
  const results = {
    tables: tablesRes.rows.map(r => r.tablename),
    tableDetails: {}
  };

  for (const table of results.tables) {
    const colRes = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 AND table_schema = 'public'", [table]);
    const countRes = await client.query(`SELECT COUNT(*) FROM public."${table}"`);
    const rlsRes = await client.query("SELECT policyname, permissive, roles, cmd FROM pg_policies WHERE tablename = $1 AND schemaname = 'public'", [table]);

    results.tableDetails[table] = {
      columns: colRes.rows,
      count: countRes.rows[0].count,
      policies: rlsRes.rows
    };
  }

  const rlsEnabledRes = await client.query("SELECT relname, relrowsecurity FROM pg_class WHERE relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public') AND relkind = 'r'");
  results.rlsEnabled = rlsEnabledRes.rows;

  const rolesRes = await client.query("SELECT * FROM public.role_permissions");
  results.rolesCount = rolesRes.rows.length;

  const couponsRes = await client.query("SELECT code, type, value, is_active, times_used FROM public.coupons");
  results.coupons = couponsRes.rows;

  fs.writeFileSync('db_audit8.json', JSON.stringify(results, null, 2), 'utf8');
  console.log('Successfully wrote db_audit8.json with', results.tables.length, 'tables!');

  await client.end();
}

run().catch(console.error);
