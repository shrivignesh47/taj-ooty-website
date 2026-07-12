-- Save as supabase/migrations/005_kot_item_status.sql
CREATE TABLE IF NOT EXISTS order_item_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid REFERENCES order_items(id) ON DELETE CASCADE,
  is_done boolean NOT NULL DEFAULT false,
  marked_by uuid REFERENCES staff_users(id),
  marked_at timestamptz DEFAULT now(),
  UNIQUE(order_item_id)
);
ALTER TABLE order_item_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kitchen can manage item status" ON order_item_status;
CREATE POLICY "kitchen can manage item status" ON order_item_status
  FOR ALL USING (true);

DROP POLICY IF EXISTS "kitchen can insert item status" ON order_item_status;
CREATE POLICY "kitchen can insert item status" ON order_item_status
  FOR INSERT WITH CHECK (true);
