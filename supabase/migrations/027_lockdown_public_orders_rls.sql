-- ============================================================
-- 027_lockdown_public_orders_rls.sql
-- Lock down public direct select on orders and order_items
-- Anonymous order tracking must go through getOrderStatus server action
-- ============================================================

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
