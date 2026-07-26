-- ============================================================
-- 028_table_occupancy_unique_index.sql
-- Ensure only one active (non-billed, non-cancelled) order per table at a time
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_order_per_table
  ON public.orders (table_id)
  WHERE status NOT IN ('billed', 'cancelled');
