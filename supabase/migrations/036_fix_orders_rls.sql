-- ============================================================
-- 036_fix_orders_rls.sql
-- Fix RLS insert policies for orders and order_items tables
-- ============================================================

-- Ensure public/anon/authenticated can insert into orders
DROP POLICY IF EXISTS "public can create orders" ON public.orders;
DROP POLICY IF EXISTS "allow order insert" ON public.orders;

CREATE POLICY "public can create orders" ON public.orders
    FOR INSERT WITH CHECK (true);

-- Ensure public/anon/authenticated can insert into order_items
DROP POLICY IF EXISTS "public can create order_items" ON public.order_items;
DROP POLICY IF EXISTS "allow order_items insert" ON public.order_items;

CREATE POLICY "public can create order_items" ON public.order_items
    FOR INSERT WITH CHECK (true);
