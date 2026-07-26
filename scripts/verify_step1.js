const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

async function testStep1() {
    const anonClient = createClient(
        'http://localhost:54321',
        'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
        { auth: { persistSession: false }, realtime: { transport: ws } }
    );

    // 1. Direct anonymous table scan
    const { data: anonData, error: anonErr } = await anonClient.from('orders').select('*');
    console.log("ANONYMOUS DIRECT SELECT RESULT:", { count: anonData ? anonData.length : 0, error: anonErr });

    if (anonData && anonData.length > 0) {
        console.error("VERIFICATION FAILED: Anonymous user can still do table scans on orders!");
        process.exit(1);
    } else {
        console.log("VERIFICATION PASSED: Anonymous table scan correctly returned 0 rows.");
    }
}

testStep1().catch(err => {
    console.error("VERIFICATION ERROR:", err);
    process.exit(1);
});
