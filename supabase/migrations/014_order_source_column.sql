-- Add source column to orders table (allows: 'dine_in', 'takeaway', 'swiggy', 'zomato')
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'dine_in';

-- Add Swiggy / Zomato configuration columns to restaurant_settings table
ALTER TABLE public.restaurant_settings
ADD COLUMN IF NOT EXISTS swiggy_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS zomato_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS swiggy_merchant_id text DEFAULT '',
ADD COLUMN IF NOT EXISTS zomato_merchant_id text DEFAULT '';
