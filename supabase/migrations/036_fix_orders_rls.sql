-- ============================================================
-- 036_fix_orders_rls.sql
-- Fix RLS policies & enable full Realtime WebSocket broadcasting
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

-- Ensure public/anon/authenticated can view orders (for realtime select)
DROP POLICY IF EXISTS "allow public select orders" ON public.orders;
CREATE POLICY "allow public select orders" ON public.orders
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "allow public select order_items" ON public.order_items;
CREATE POLICY "allow public select order_items" ON public.order_items
    FOR SELECT USING (true);

-- Enable REPLICA IDENTITY FULL for full payload realtime streaming
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.order_items REPLICA IDENTITY FULL;

-- Guarantee orders and order_items tables are in supabase_realtime publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'order_items'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
    END IF;
END $$;
