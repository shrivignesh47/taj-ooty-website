# Local ↔ Cloud Supabase Sync Fix Guide

## Problem identified
1. Duplicate role: `admin` (seeded, correct) + `Admin` (manually created, incorrect) — must remove the duplicate
2. Local DB may be missing tables added later: `staff_activity_log`, `restaurant_settings`
3. Local seed data may be incomplete or out of sync with cloud

---

## Step 1: Fix duplicate role in cloud first

Run this in the **cloud** Supabase SQL Editor:

```sql
-- Remove the duplicate manually-created 'Admin' role (capital A)
-- First check if any staff_users are pointing to it
SELECT id, name FROM roles WHERE name = 'Admin';

-- Reassign any staff using the duplicate 'Admin' role to the correct 'admin' role
UPDATE staff_users
SET role_id = (SELECT id FROM roles WHERE name = 'admin' AND is_custom = false)
WHERE role_id = (SELECT id FROM roles WHERE name = 'Admin');

-- Now delete the duplicate
DELETE FROM roles WHERE name = 'Admin' AND is_custom = false;

-- Verify: should now show exactly 4 roles: admin, waiter, kitchen, cashier
SELECT name, is_custom FROM roles ORDER BY name;
```

---

## Step 2: Ensure all migrations exist locally

Check your `supabase/migrations/` folder. We have updated `20260710_admin_features.sql` to include:

```sql
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
  gstin text,
  fssai_number text,
  address text,
  contact_phone text,
  contact_email text,
  website text,
  sgst_percent numeric(5,2) DEFAULT 2.5,
  cgst_percent numeric(5,2) DEFAULT 2.5,
  service_charge_percent numeric(5,2) DEFAULT 5.0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE restaurant_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin can manage settings" ON restaurant_settings
  FOR ALL USING (has_permission('manage_staff'));

-- Insert default row (only if empty)
INSERT INTO restaurant_settings (restaurant_name)
SELECT 'Hotel Taj Ooty'
WHERE NOT EXISTS (SELECT 1 FROM restaurant_settings);
```

---

## Step 3: Fix `supabase/seed.sql` — must match cloud exactly

Created `supabase/seed.sql` to ensure `npx supabase db reset` generates identical clean states:

```sql
-- ─── Roles ────────────────────────────────────────────────────────────────────
INSERT INTO roles (name, is_custom) VALUES
  ('admin',   false),
  ('waiter',  false),
  ('kitchen', false),
  ('cashier', false)
ON CONFLICT (name) DO NOTHING;

-- ─── Permissions ──────────────────────────────────────────────────────────────
INSERT INTO permissions (key) VALUES
  ('view_orders'),
  ('edit_orders'),
  ('confirm_orders'),
  ('view_kitchen_queue'),
  ('update_prep_status'),
  ('view_billing'),
  ('generate_bills'),
  ('edit_menu'),
  ('manage_staff'),
  ('manage_roles'),
  ('view_revenue'),
  ('export_data'),
  ('manage_tables'),
  ('view_dashboard'),
  ('view_activity_log')
ON CONFLICT (key) DO NOTHING;

-- ─── Role ↔ Permission assignments ────────────────────────────────────────────
-- Admin gets every permission
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Waiter
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'waiter'
  AND p.key IN ('view_orders', 'edit_orders', 'confirm_orders')
ON CONFLICT DO NOTHING;

-- Kitchen
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'kitchen'
  AND p.key IN ('view_kitchen_queue', 'update_prep_status')
ON CONFLICT DO NOTHING;

-- Cashier
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'cashier'
  AND p.key IN ('view_billing', 'generate_bills')
ON CONFLICT DO NOTHING;

-- ─── Restaurant settings default row ──────────────────────────────────────────
INSERT INTO restaurant_settings (restaurant_name)
SELECT 'Hotel Taj Ooty'
WHERE NOT EXISTS (SELECT 1 FROM restaurant_settings);
```

---

## Step 4: Reset local DB to apply everything cleanly

```bash
npx supabase db reset
```

This will:
1. Drop all local tables
2. Re-run all migration files in `supabase/migrations/` in order
3. Run `supabase/seed.sql` automatically
4. Result: clean local DB matching the correct cloud schema exactly

---

## Step 5: Push fixed schema to cloud (when ready)

Once local is clean and correct:

```bash
# Link to cloud project (if not already linked)
npx supabase link --project-ref <cloud-project-id>

# Push all migrations to cloud
npx supabase db push
```

This makes cloud = local. From this point, always develop locally first, then push.
