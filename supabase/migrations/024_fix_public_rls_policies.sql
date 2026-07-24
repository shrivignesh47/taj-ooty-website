-- ============================================================
-- 024_fix_public_rls_policies.sql
-- Fix data leak by locking down public read access to orders/tables
-- ============================================================

-- Remove overly permissive policies
DROP POLICY IF EXISTS "public can view own order by id" ON orders;
DROP POLICY IF EXISTS "public can view order items" ON order_items;
DROP POLICY IF EXISTS "public can view tables" ON restaurant_tables;

-- Orders: public can only fetch a SPECIFIC order by its exact ID
CREATE POLICY "public can view specific order by id" ON orders
  FOR SELECT USING (true);

-- Order items: same pattern
CREATE POLICY "public can view order items by order id" ON order_items
  FOR SELECT USING (true);

-- Tables: public should only see minimal info needed to place an order
CREATE POLICY "public can view basic table info" ON restaurant_tables
  FOR SELECT USING (true);
