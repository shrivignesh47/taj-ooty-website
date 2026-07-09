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
  ('manage_tables')
ON CONFLICT (key) DO NOTHING;

-- ─── Role ↔ Permission assignments ────────────────────────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'waiter' AND p.key IN ('view_orders', 'edit_orders', 'confirm_orders')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'kitchen' AND p.key IN ('view_kitchen_queue', 'update_prep_status')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'cashier' AND p.key IN ('view_billing', 'generate_bills')
ON CONFLICT DO NOTHING;

-- ─── Restaurant settings default row ──────────────────────────────────────────
INSERT INTO restaurant_settings (restaurant_name)
SELECT 'Hotel Taj Ooty'
WHERE NOT EXISTS (SELECT 1 FROM restaurant_settings);
