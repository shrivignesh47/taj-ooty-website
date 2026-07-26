const { Client } = require('pg');

async function run() {
    const client = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' });
    await client.connect();

    const sql = `
    DROP TRIGGER IF EXISTS trg_refund_stock_on_cancel ON orders;
    DROP FUNCTION IF EXISTS refund_stock_on_cancel();

    CREATE OR REPLACE FUNCTION refund_stock_on_cancel()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
        UPDATE menu_items mi
        SET stock_qty = mi.stock_qty + oi.qty
        FROM order_items oi
        WHERE oi.order_id = NEW.id
          AND oi.menu_item_id = mi.id
          AND mi.stock_qty IS NOT NULL;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_refund_stock_on_cancel
      AFTER UPDATE ON orders
      FOR EACH ROW EXECUTE FUNCTION refund_stock_on_cancel();
    `;

    await client.query(sql);
    console.log("STEP 3 STOCK REFUND TRIGGER APPLIED SUCCESSFULLY");
    await client.end();
}

run().catch(err => {
    console.error("STEP 3 ERROR:", err);
    process.exit(1);
});
