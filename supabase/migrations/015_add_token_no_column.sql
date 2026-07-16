-- Add token_no column to orders table for takeaway / parcel order tracking
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS token_no text;
