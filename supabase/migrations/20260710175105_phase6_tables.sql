-- Staff activity audit log
CREATE TABLE IF NOT EXISTS staff_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff_users(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE staff_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin can view activity log" ON staff_activity_log
  FOR SELECT USING (has_permission('manage_staff'));

CREATE POLICY "server can insert activity log" ON staff_activity_log
  FOR INSERT WITH CHECK (true);

-- Restaurant settings (single row)
CREATE TABLE IF NOT EXISTS restaurant_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_name text NOT NULL DEFAULT 'Hotel Taj Ooty',
  gst_number text,
  fssai_number text,
  address text,
  phone text,
  email text,
  website text,
  service_charge_percent numeric(5,2) DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE restaurant_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin can manage settings" ON restaurant_settings
  FOR ALL USING (has_permission('manage_staff'));

INSERT INTO restaurant_settings (restaurant_name)
SELECT 'Hotel Taj Ooty'
WHERE NOT EXISTS (SELECT 1 FROM restaurant_settings);
