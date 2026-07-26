const { Client } = require('pg');

async function run() {
    const client = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' });
    await client.connect();

    const sql = `
    DROP POLICY IF EXISTS "public can view specific order by id" ON public.orders;
    DROP POLICY IF EXISTS "public can view order items by order id" ON public.order_items;
    DROP POLICY IF EXISTS "public can view own order by id" ON public.orders;
    DROP POLICY IF EXISTS "public can view order items" ON public.order_items;
    DROP POLICY IF EXISTS "no direct public select on orders" ON public.orders;
    DROP POLICY IF EXISTS "no direct public select on order_items" ON public.order_items;

    CREATE POLICY "no direct public select on orders" ON public.orders
      FOR SELECT USING (false);

    CREATE POLICY "no direct public select on order_items" ON public.order_items
      FOR SELECT USING (false);
    `;

    await client.query(sql);
    console.log("STEP 1 RLS POLICIES EXECUTED SUCCESSFULLY");
    await client.end();
}

run().catch(err => {
    console.error("STEP 1 ERROR:", err);
    process.exit(1);
});
