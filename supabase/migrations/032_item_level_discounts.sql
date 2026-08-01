-- ============================================================
-- 029_item_level_discounts.sql
-- Add item-level discount_percent and discount_reason columns to order_items
-- ============================================================

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS discount_percent numeric(5,2) DEFAULT 0;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS discount_reason text;
