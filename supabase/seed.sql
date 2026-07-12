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

-- Create admin auth user (local dev only)
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  phone_change, phone_change_token, reauthentication_token,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin
) VALUES (
  '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
  'admin@tajooty.com', crypt('Admin@123', gen_salt('bf')), now(),
  '', '', '', '', '', '', '',
  now(), now(), '{"provider":"email","providers":["email"]}', '{}', false
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  format('{"sub":"%s","email":"%s"}', '00000000-0000-0000-0000-000000000001', 'admin@tajooty.com')::jsonb,
  'email', '00000000-0000-0000-0000-000000000001', now(), now(), now()
) ON CONFLICT ON CONSTRAINT identities_pkey DO NOTHING;

-- Also create test waiter
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  phone_change, phone_change_token, reauthentication_token,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin
) VALUES (
  '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated',
  'waiter@tajooty.com', crypt('Waiter@123', gen_salt('bf')), now(),
  '', '', '', '', '', '', '',
  now(), now(), '{"provider":"email","providers":["email"]}', '{}', false
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002',
  format('{"sub":"%s","email":"%s"}', '00000000-0000-0000-0000-000000000002', 'waiter@tajooty.com')::jsonb,
  'email', '00000000-0000-0000-0000-000000000002', now(), now(), now()
) ON CONFLICT ON CONSTRAINT identities_pkey DO NOTHING;

-- Create test kitchen user
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  phone_change, phone_change_token, reauthentication_token,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin
) VALUES (
  '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated',
  'kitchen@tajooty.com', crypt('Kitchen@123', gen_salt('bf')), now(),
  '', '', '', '', '', '', '',
  now(), now(), '{"provider":"email","providers":["email"]}', '{}', false
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003',
  format('{"sub":"%s","email":"%s"}', '00000000-0000-0000-0000-000000000003', 'kitchen@tajooty.com')::jsonb,
  'email', '00000000-0000-0000-0000-000000000003', now(), now(), now()
) ON CONFLICT ON CONSTRAINT identities_pkey DO NOTHING;

-- Create test cashier user  
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  phone_change, phone_change_token, reauthentication_token,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin
) VALUES (
  '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated',
  'cashier@tajooty.com', crypt('Cashier@123', gen_salt('bf')), now(),
  '', '', '', '', '', '', '',
  now(), now(), '{"provider":"email","providers":["email"]}', '{}', false
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004',
  format('{"sub":"%s","email":"%s"}', '00000000-0000-0000-0000-000000000004', 'cashier@tajooty.com')::jsonb,
  'email', '00000000-0000-0000-0000-000000000004', now(), now(), now()
) ON CONFLICT ON CONSTRAINT identities_pkey DO NOTHING;

-- Also seed short domain (@taj.com) accounts with password123 for convenience
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  phone_change, phone_change_token, reauthentication_token,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin
) VALUES 
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000011', 'authenticated', 'authenticated', 'admin@taj.com', crypt('password123', gen_salt('bf')), now(), '', '', '', '', '', '', '', now(), now(), '{"provider":"email","providers":["email"]}', '{}', false),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000012', 'authenticated', 'authenticated', 'waiter@taj.com', crypt('password123', gen_salt('bf')), now(), '', '', '', '', '', '', '', now(), now(), '{"provider":"email","providers":["email"]}', '{}', false),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000013', 'authenticated', 'authenticated', 'kitchen@taj.com', crypt('password123', gen_salt('bf')), now(), '', '', '', '', '', '', '', now(), now(), '{"provider":"email","providers":["email"]}', '{}', false),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000014', 'authenticated', 'authenticated', 'cashier@taj.com', crypt('password123', gen_salt('bf')), now(), '', '', '', '', '', '', '', now(), now(), '{"provider":"email","providers":["email"]}', '{}', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
) VALUES 
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000011', format('{"sub":"%s","email":"%s"}', '00000000-0000-0000-0000-000000000011', 'admin@taj.com')::jsonb, 'email', '00000000-0000-0000-0000-000000000011', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000012', format('{"sub":"%s","email":"%s"}', '00000000-0000-0000-0000-000000000012', 'waiter@taj.com')::jsonb, 'email', '00000000-0000-0000-0000-000000000012', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000013', format('{"sub":"%s","email":"%s"}', '00000000-0000-0000-0000-000000000013', 'kitchen@taj.com')::jsonb, 'email', '00000000-0000-0000-0000-000000000013', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000014', format('{"sub":"%s","email":"%s"}', '00000000-0000-0000-0000-000000000014', 'cashier@taj.com')::jsonb, 'email', '00000000-0000-0000-0000-000000000014', now(), now(), now())
ON CONFLICT ON CONSTRAINT identities_pkey DO NOTHING;

-- Link all auth users to staff_users table
INSERT INTO staff_users (auth_id, name, phone, role_id) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Admin User',
    '9999999991',
    (SELECT id FROM roles WHERE name = 'admin')
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'Shri Vignesh',
    '9999999992',
    (SELECT id FROM roles WHERE name = 'waiter')
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'Kitchen Staff',
    '9999999993',
    (SELECT id FROM roles WHERE name = 'kitchen')
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    'Cashier Staff',
    '9999999994',
    (SELECT id FROM roles WHERE name = 'cashier')
  ),
  (
    '00000000-0000-0000-0000-000000000011',
    'Admin User (@taj.com)',
    '9999999981',
    (SELECT id FROM roles WHERE name = 'admin')
  ),
  (
    '00000000-0000-0000-0000-000000000012',
    'Shri Vignesh (@taj.com)',
    '9999999982',
    (SELECT id FROM roles WHERE name = 'waiter')
  ),
  (
    '00000000-0000-0000-0000-000000000013',
    'Kitchen Staff (@taj.com)',
    '9999999983',
    (SELECT id FROM roles WHERE name = 'kitchen')
  ),
  (
    '00000000-0000-0000-0000-000000000014',
    'Cashier Staff (@taj.com)',
    '9999999984',
    (SELECT id FROM roles WHERE name = 'cashier')
  )
ON CONFLICT (auth_id) DO NOTHING;

-- Seed 25 restaurant tables
INSERT INTO restaurant_tables (table_no)
SELECT generate_series FROM generate_series(1, 25)
ON CONFLICT (table_no) DO NOTHING;

UPDATE restaurant_tables
SET qr_code_url = 'http://localhost:3000/MenuCard?table=' || id::text;

-- Seed categories and menu items
DO $$
DECLARE
  v_soup_id uuid;
  v_sand_id uuid;
  v_star_id uuid;
  v_shaw_id uuid;
  v_tand_id uuid;
  v_briy_id uuid;
  v_rice_id uuid;
  v_seaf_id uuid;
  v_drin_id uuid;
  v_icec_id uuid;
  v_milk_id uuid;
  v_dess_id uuid;
BEGIN
  INSERT INTO categories (name) VALUES ('Soup') ON CONFLICT DO NOTHING RETURNING id INTO v_soup_id;
  IF v_soup_id IS NULL THEN SELECT id INTO v_soup_id FROM categories WHERE name = 'Soup'; END IF;

  INSERT INTO categories (name) VALUES ('Sandwiches') ON CONFLICT DO NOTHING RETURNING id INTO v_sand_id;
  IF v_sand_id IS NULL THEN SELECT id INTO v_sand_id FROM categories WHERE name = 'Sandwiches'; END IF;

  INSERT INTO categories (name) VALUES ('Starters') ON CONFLICT DO NOTHING RETURNING id INTO v_star_id;
  IF v_star_id IS NULL THEN SELECT id INTO v_star_id FROM categories WHERE name = 'Starters'; END IF;

  INSERT INTO categories (name) VALUES ('Shawarma') ON CONFLICT DO NOTHING RETURNING id INTO v_shaw_id;
  IF v_shaw_id IS NULL THEN SELECT id INTO v_shaw_id FROM categories WHERE name = 'Shawarma'; END IF;

  INSERT INTO categories (name) VALUES ('Tandoori') ON CONFLICT DO NOTHING RETURNING id INTO v_tand_id;
  IF v_tand_id IS NULL THEN SELECT id INTO v_tand_id FROM categories WHERE name = 'Tandoori'; END IF;

  INSERT INTO categories (name) VALUES ('Briyani') ON CONFLICT DO NOTHING RETURNING id INTO v_briy_id;
  IF v_briy_id IS NULL THEN SELECT id INTO v_briy_id FROM categories WHERE name = 'Briyani'; END IF;

  INSERT INTO categories (name) VALUES ('Rice & Noodles') ON CONFLICT DO NOTHING RETURNING id INTO v_rice_id;
  IF v_rice_id IS NULL THEN SELECT id INTO v_rice_id FROM categories WHERE name = 'Rice & Noodles'; END IF;

  INSERT INTO categories (name) VALUES ('Sea Food') ON CONFLICT DO NOTHING RETURNING id INTO v_seaf_id;
  IF v_seaf_id IS NULL THEN SELECT id INTO v_seaf_id FROM categories WHERE name = 'Sea Food'; END IF;

  INSERT INTO categories (name) VALUES ('Drinks') ON CONFLICT DO NOTHING RETURNING id INTO v_drin_id;
  IF v_drin_id IS NULL THEN SELECT id INTO v_drin_id FROM categories WHERE name = 'Drinks'; END IF;

  INSERT INTO categories (name) VALUES ('Ice Cream') ON CONFLICT DO NOTHING RETURNING id INTO v_icec_id;
  IF v_icec_id IS NULL THEN SELECT id INTO v_icec_id FROM categories WHERE name = 'Ice Cream'; END IF;

  INSERT INTO categories (name) VALUES ('Milk Shake') ON CONFLICT DO NOTHING RETURNING id INTO v_milk_id;
  IF v_milk_id IS NULL THEN SELECT id INTO v_milk_id FROM categories WHERE name = 'Milk Shake'; END IF;

  INSERT INTO categories (name) VALUES ('Dessert') ON CONFLICT DO NOTHING RETURNING id INTO v_dess_id;
  IF v_dess_id IS NULL THEN SELECT id INTO v_dess_id FROM categories WHERE name = 'Dessert'; END IF;

  -- Insert Briyani items
  INSERT INTO menu_items (category_id, name, price, is_available) VALUES
    (v_briy_id, 'Taj Special Mutton Briyani', 320, true),
    (v_briy_id, 'Mutton Dum Briyani', 300, true),
    (v_briy_id, 'Taj Special Chicken Briyani', 260, true),
    (v_briy_id, 'Chicken Dum Briyani', 240, true),
    (v_briy_id, 'Chicken 65 Briyani', 250, true),
    (v_briy_id, 'Egg Briyani', 180, true),
    (v_briy_id, 'Paneer Briyani', 200, true),
    (v_briy_id, 'Mushroom Briyani', 200, true),
    (v_briy_id, 'Veg Dum Briyani', 170, true),
    (v_briy_id, 'Plain Briyani (Khuska)', 140, true)
  ON CONFLICT DO NOTHING;

  -- Insert Soup items
  INSERT INTO menu_items (category_id, name, price, is_available) VALUES
    (v_soup_id, 'Cream of Tomato', 145, true),
    (v_soup_id, 'Cream of Mushroom', 145, true),
    (v_soup_id, 'Veg Clear Soup', 145, true),
    (v_soup_id, 'Sweet Corn Veg Soup', 155, true),
    (v_soup_id, 'Hot''n''Sour Veg Soup', 150, true),
    (v_soup_id, 'Baby Corn Garlic Soup', 145, true),
    (v_soup_id, 'Veg Manchow Soup', 155, true),
    (v_soup_id, 'Cream Of Chicken', 165, true),
    (v_soup_id, 'Chicken Rasam', 175, true),
    (v_soup_id, 'Sweet Corn Chicken Soup', 165, true),
    (v_soup_id, 'Hot''n'' Sour Chicken Soup', 175, true),
    (v_soup_id, 'Chicken Manchow Soup', 175, true),
    (v_soup_id, 'Mutton Rasam Soup', 195, true),
    (v_soup_id, 'Hot''n'' Sour Mutton Soup', 210, true),
    (v_soup_id, 'Lung Fung Mutton Soup', 210, true)
  ON CONFLICT DO NOTHING;

  -- Insert Sandwiches items
  INSERT INTO menu_items (category_id, name, price, is_available) VALUES
    (v_sand_id, 'Panner Tikka Sandwich', 130, true),
    (v_sand_id, 'Veg Cheese Sandwich', 120, true),
    (v_sand_id, 'Veg Burger', 105, true),
    (v_sand_id, 'Chicken Club Sandwich', 170, true),
    (v_sand_id, 'Chicken Tikka Sandwich', 150, true),
    (v_sand_id, 'Chicken Burger', 135, true)
  ON CONFLICT DO NOTHING;

  -- Insert Starters items
  INSERT INTO menu_items (category_id, name, price, is_available) VALUES
    (v_star_id, 'Crispy Potato', 185, true),
    (v_star_id, 'Gobi 65', 200, true),
    (v_star_id, 'Paneer 65 / Mushroom 65', 210, true),
    (v_star_id, 'Gobi Manchurian', 210, true),
    (v_star_id, 'Paneer Manchurian', 210, true),
    (v_star_id, 'Mushroom Manchurian', 210, true),
    (v_star_id, 'Chilli Gobi', 200, true),
    (v_star_id, 'Chilli Paneer', 210, true),
    (v_star_id, 'Chilli Mushroom', 210, true),
    (v_star_id, 'Veg Spring Roll', 210, true),
    (v_star_id, 'Baby Corn Chilli', 210, true),
    (v_star_id, 'Baby Corn Pepper Fry', 210, true),
    (v_star_id, 'Finger Chips', 175, true),
    (v_star_id, 'Mushroom Pepper Fry', 210, true),
    (v_star_id, 'Paneer Pepper Fry', 210, true),
    (v_star_id, 'Paneer Burji', 210, true),
    (v_star_id, 'Dragon Paneer', 210, true),
    (v_star_id, 'Hot Pepper', 210, true),
    (v_star_id, 'Chicken lollipop with Miyonise', 260, true),
    (v_star_id, 'Chicken Karuveppilai Fry (BL)', 225, true),
    (v_star_id, 'Chicken 65 (BL)', 235, true),
    (v_star_id, 'Fried Chicken Leg', 185, true),
    (v_star_id, 'Pepper Chicken Dry (BL)', 225, true),
    (v_star_id, 'Chicken Sukka', 225, true),
    (v_star_id, 'Coriander Chicken Dry (BL)', 235, true),
    (v_star_id, 'Dragon Chicken Dry (BL)', 245, true)
  ON CONFLICT DO NOTHING;

  -- Insert Shawarma items
  INSERT INTO menu_items (category_id, name, price, is_available) VALUES
    (v_shaw_id, 'Roll Shawarma', 140, true),
    (v_shaw_id, 'Pepper Shawarma', 150, true),
    (v_shaw_id, 'Masala Shawarma', 165, true),
    (v_shaw_id, 'Plate Shawarma', 215, true),
    (v_shaw_id, 'Taj Special Roll Shawarma', 185, true),
    (v_shaw_id, 'Bowl Shawarma', 215, true),
    (v_shaw_id, 'Cheese Shawarma', 165, true),
    (v_shaw_id, 'Spicy Mexican Roll', 145, true),
    (v_shaw_id, 'Double Cheese & Pepper Plates', 235, true),
    (v_shaw_id, 'Loaded Shawarma Fries', 255, true),
    (v_shaw_id, 'Peri Peri Shawarma', 155, true)
  ON CONFLICT DO NOTHING;

  -- Insert Tandoori items
  INSERT INTO menu_items (category_id, name, price, is_available) VALUES
    (v_tand_id, 'Paneer Tikka', 305, true),
    (v_tand_id, 'Afghani Paneer Tikka', 305, true),
    (v_tand_id, 'Malai Chicken Tikka', 300, true),
    (v_tand_id, 'Chicken Kabab', 300, true),
    (v_tand_id, 'Chicken Sheek Kabab', 300, true),
    (v_tand_id, 'Mutton Sheek Kabab', 400, true),
    (v_tand_id, 'Chicken Tikka', 300, true),
    (v_tand_id, 'Tangri Kabab', 300, true),
    (v_tand_id, 'Fish Tikka', 320, true),
    (v_tand_id, 'Beef Sheek Kabab', 275, true),
    (v_tand_id, 'Non-Veg MixPlater', 1380, true),
    (v_tand_id, 'Hariyali Tikka', 300, true),
    (v_tand_id, 'Hariyali Kabab', 300, true)
  ON CONFLICT DO NOTHING;

  -- Insert Briyani items
  INSERT INTO menu_items (category_id, name, price, is_available) VALUES
    (v_briy_id, 'Plain Briyani', 180, true),
    (v_briy_id, 'Vegetable Biriyani', 180, true),
    (v_briy_id, 'Paneer Briyani', 180, true),
    (v_briy_id, 'Mushroom Briyani', 185, true),
    (v_briy_id, 'Egg Briyani', 190, true),
    (v_briy_id, 'Chicken Briyani', 220, true),
    (v_briy_id, 'Beef Briyani', 190, true),
    (v_briy_id, 'Fish Briyani', 255, true),
    (v_briy_id, 'Prawn Briyani', 285, true)
  ON CONFLICT DO NOTHING;

  -- Insert Rice & Noodles items
  INSERT INTO menu_items (category_id, name, price, is_available) VALUES
    (v_rice_id, 'Ghee Rice', 150, true),
    (v_rice_id, 'Jeera Rice', 180, true),
    (v_rice_id, 'Gobi Rice', 180, true),
    (v_rice_id, 'Vegetable Fried Rice / Noodles', 190, true),
    (v_rice_id, 'Paneer Fried Rice / Noodles', 200, true),
    (v_rice_id, 'Schezwan Veg Fried Rice/Noodles', 195, true),
    (v_rice_id, 'Mushroom Fried Rice / Noodles', 200, true),
    (v_rice_id, 'Singapore Veg Fried Rice / Noodles', 200, true),
    (v_rice_id, 'Taj Spl Veg Fried Rice / Noodles', 200, true),
    (v_rice_id, 'Shanghai Veg Fried Rice / Noodles', 200, true),
    (v_rice_id, 'American Veg Chop Suey', 245, true),
    (v_rice_id, 'Egg Fried Rice / Noodles', 200, true),
    (v_rice_id, 'Chicken Fried Rice / Noodles', 220, true),
    (v_rice_id, 'Prawn Fried Rice / Noodles', 255, true),
    (v_rice_id, 'Schezwan Chicken Fried Rice / Noodles', 225, true),
    (v_rice_id, 'Shanghai Chicken Fried Rice / Noodles', 240, true),
    (v_rice_id, 'Singapore Chicken Fried Rice / Noodles', 240, true),
    (v_rice_id, 'Taj Mixed Fried Rice / Noodles', 280, true),
    (v_rice_id, 'Beef Fried Rice / Noodles', 220, true),
    (v_rice_id, 'American Chop Suey Chicken', 315, true)
  ON CONFLICT DO NOTHING;

  -- Insert Sea Food items
  INSERT INTO menu_items (category_id, name, price, is_available) VALUES
    (v_seaf_id, 'Fish 65', 230, true),
    (v_seaf_id, 'Fish finger with miyonise', 265, true),
    (v_seaf_id, 'Masala Fried Fish', 245, true),
    (v_seaf_id, 'Chilli Fish', 235, true),
    (v_seaf_id, 'Garlic Fish', 245, true),
    (v_seaf_id, 'Ginger Fish', 245, true),
    (v_seaf_id, 'Dragon Fish', 250, true),
    (v_seaf_id, 'Pepper Fish', 255, true),
    (v_seaf_id, 'Andra Fish Curry', 255, true),
    (v_seaf_id, 'Madras Fish Curry', 265, true),
    (v_seaf_id, 'Fish Chettinad', 270, true),
    (v_seaf_id, 'Fish Manchurian', 270, true),
    (v_seaf_id, 'Puli Melagu Fish Curry', 315, true),
    (v_seaf_id, 'Malabar Fish Curry', 315, true),
    (v_seaf_id, 'Prawn Pepper Fry', 315, true),
    (v_seaf_id, 'Prawn Masala', 315, true),
    (v_seaf_id, 'Chilli Prawn', 325, true),
    (v_seaf_id, 'Ginger Prawn', 325, true),
    (v_seaf_id, 'Prawn 65', 325, true),
    (v_seaf_id, 'Prawn Manchurian', 335, true)
  ON CONFLICT DO NOTHING;

  -- Insert Drinks items
  INSERT INTO menu_items (category_id, name, price, is_available) VALUES
    (v_drin_id, 'Fresh Lime Soda', 55, true),
    (v_drin_id, 'Fresh lime Water', 40, true),
    (v_drin_id, 'Jul Jeera Soda', 60, true),
    (v_drin_id, 'Mint Lime Water', 50, true),
    (v_drin_id, 'Cold Coffee', 130, true),
    (v_drin_id, 'Cold Coffee With Ice', 160, true),
    (v_drin_id, 'Mint Lime Soda', 55, true),
    (v_drin_id, 'Blue Curacao', 85, true),
    (v_drin_id, 'Vergin Mojito', 85, true),
    (v_drin_id, 'Black Current', 90, true),
    (v_drin_id, 'Rose Milk', 85, true),
    (v_drin_id, 'Falooda', 150, true),
    (v_drin_id, 'Fruit Juice', 105, true),
    (v_drin_id, 'Lassi', 90, true)
  ON CONFLICT DO NOTHING;

  -- Insert Ice Cream items
  INSERT INTO menu_items (category_id, name, price, is_available) VALUES
    (v_icec_id, 'Vanilla Ice Cream', 80, true),
    (v_icec_id, 'Strawberry Ice Cream', 80, true),
    (v_icec_id, 'Spl Ice Cream', 140, true),
    (v_icec_id, 'Butter Scotch Ice Cream', 95, true),
    (v_icec_id, 'Pista Ice Cream', 100, true),
    (v_icec_id, 'Chocolate Ice Cream', 90, true)
  ON CONFLICT DO NOTHING;

  -- Insert Milk Shake items
  INSERT INTO menu_items (category_id, name, price, is_available) VALUES
    (v_milk_id, 'Apple Milkshake', 120, true),
    (v_milk_id, 'Vanilla Milkshake', 120, true),
    (v_milk_id, 'Strawberry Milkshakes', 120, true),
    (v_milk_id, 'Butter Scotch Milkshake', 120, true),
    (v_milk_id, 'Pista Milkshake', 120, true),
    (v_milk_id, 'Chocolate Milkshake', 120, true),
    (v_milk_id, 'Masala Butter Milk', 70, true)
  ON CONFLICT DO NOTHING;

  -- Insert Dessert items
  INSERT INTO menu_items (category_id, name, price, is_available) VALUES
    (v_dess_id, 'Gulab Jamun', 50, true),
    (v_dess_id, 'Gulab Jamun with Ice Cream', 90, true),
    (v_dess_id, 'Brownie with Ice-Cream', 109, true),
    (v_dess_id, 'Brownie with Hot Choco Sauce', 70, true)
  ON CONFLICT DO NOTHING;
END $$;
