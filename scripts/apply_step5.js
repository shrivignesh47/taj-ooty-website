const { Client } = require('pg');

async function run() {
    const client = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' });
    await client.connect();

    const sql = `
    CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_order_per_table
      ON public.orders (table_id)
      WHERE status NOT IN ('billed', 'cancelled');
    `;

    await client.query(sql);
    console.log("STEP 5 UNIQUE INDEX APPLIED SUCCESSFULLY");
    await client.end();
}

run().catch(err => {
    console.error("STEP 5 ERROR:", err);
    process.exit(1);
});
