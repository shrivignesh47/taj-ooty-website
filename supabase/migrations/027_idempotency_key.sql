-- ============================================================
-- 025_idempotency_key.sql
-- Add idempotency_key column to orders table with UNIQUE constraint
-- ============================================================

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS idempotency_key text UNIQUE;
