-- ============================================================
-- 034_missing_settings_permissions.sql
-- Fix missing restaurant_settings columns and permission keys
-- ============================================================

-- FIX 1: Add GST/service charge columns that the UI already reads
ALTER TABLE public.restaurant_settings
  ADD COLUMN IF NOT EXISTS gst_rate          numeric(5,2) NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS is_gst_inclusive  boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS service_charge_rate numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS charge_service_tax boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS footer_note       text         DEFAULT 'Thank you! Visit again.';

-- FIX 2: Add missing permission keys (apply_discount, view_reports)
INSERT INTO public.permissions (key) VALUES
  ('apply_discount'),
  ('view_reports')
ON CONFLICT DO NOTHING;

-- FIX 3: Assign apply_discount to cashier and admin roles
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name IN ('cashier', 'admin')
  AND p.key = 'apply_discount'
ON CONFLICT DO NOTHING;

-- FIX 4: Assign view_reports to cashier and admin roles
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name IN ('cashier', 'admin')
  AND p.key = 'view_reports'
ON CONFLICT DO NOTHING;

SELECT 'Migration 034 applied: gst_rate, is_gst_inclusive, service_charge_rate, apply_discount, view_reports.' AS result;
