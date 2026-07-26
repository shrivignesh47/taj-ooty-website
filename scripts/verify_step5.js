const { Client } = require('pg');

async function verify() {
    const client = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' });
    await client.connect();

    const res = await client.query(`
        SELECT indexname FROM pg_indexes WHERE indexname = 'idx_one_active_order_per_table';
    `);

    console.log('INDEX CHECK RESULT:', res.rows);
    if (res.rows.length === 1) {
        console.log('STEP 5 VERIFICATION PASSED: idx_one_active_order_per_table unique index exists');
    } else {
        console.error('STEP 5 VERIFICATION FAILED');
        process.exit(1);
    }
    await client.end();
}

verify().catch(err => {
    console.error(err);
    process.exit(1);
});
