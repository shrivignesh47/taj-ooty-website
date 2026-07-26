const { Client } = require('pg');

async function run() {
    const client = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' });
    await client.connect();

    const sql = `
    ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS discount_percent numeric(5,2) DEFAULT 0;
    ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS discount_reason text;
    `;

    await client.query(sql);
    console.log("ITEM-LEVEL DISCOUNT COLUMNS ADDED TO ORDER_ITEMS SUCCESSFULLY");
    await client.end();
}

run().catch(err => {
    console.error("MIGRATION ERROR:", err);
    process.exit(1);
});
