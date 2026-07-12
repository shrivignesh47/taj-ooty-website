-- Ensure unique constraint on permission key
ALTER TABLE public.permissions DROP CONSTRAINT IF EXISTS permissions_key_unique;
ALTER TABLE public.permissions ADD CONSTRAINT permissions_key_unique UNIQUE (key);

-- Insert advanced POS and GST permissions
INSERT INTO public.permissions (key) VALUES
  ('manage_gst'),
  ('view_reports'),
  ('manage_inventory'),
  ('manage_expenses'),
  ('manage_cash_drawer')
ON CONFLICT (key) DO NOTHING;
