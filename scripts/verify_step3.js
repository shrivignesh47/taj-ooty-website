const { Client } = require('pg');

async function verify() {
    const client = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' });
    await client.connect();

    const res = await client.query(`
        SELECT trigger_name FROM information_schema.triggers WHERE trigger_name = 'trg_refund_stock_on_cancel';
    `);

    console.log('TRIGGER CHECK RESULT:', res.rows);
    if (res.rows.length === 1) {
        console.log('STEP 3 VERIFICATION PASSED: trg_refund_stock_on_cancel trigger exists');
    } else {
        console.error('STEP 3 VERIFICATION FAILED');
        process.exit(1);
    }
    await client.end();
}

verify().catch(err => {
    console.error(err);
    process.exit(1);
});
