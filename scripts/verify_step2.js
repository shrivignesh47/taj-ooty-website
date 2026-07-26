const { Client } = require('pg');

async function verify() {
    const client = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' });
    await client.connect();

    const res = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'idempotency_key';
    `);

    console.log('IDEMPOTENCY COLUMN CHECK:', res.rows);
    if (res.rows.length === 1) {
        console.log('STEP 2 VERIFICATION PASSED: idempotency_key column exists');
    } else {
        console.error('STEP 2 VERIFICATION FAILED');
        process.exit(1);
    }
    await client.end();
}

verify().catch(err => {
    console.error(err);
    process.exit(1);
});
