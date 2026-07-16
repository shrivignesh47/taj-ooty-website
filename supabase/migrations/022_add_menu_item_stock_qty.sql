-- Add stock_qty column to menu_items table
ALTER TABLE public.menu_items
ADD COLUMN IF NOT EXISTS stock_qty integer DEFAULT NULL;
