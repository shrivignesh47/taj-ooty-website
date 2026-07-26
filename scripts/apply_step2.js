const { Client } = require('pg');

async function run() {
    const client = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' });
    await client.connect();

    const sql = `
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS idempotency_key text UNIQUE;
    `;

    await client.query(sql);
    console.log("STEP 2 IDEMPOTENCY_KEY COLUMN ADDED SUCCESSFULLY");
    await client.end();
}

run().catch(err => {
    console.error("STEP 2 ERROR:", err);
    process.exit(1);
});
