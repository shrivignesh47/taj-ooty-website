-- Kitchen stations
CREATE TABLE IF NOT EXISTS kitchen_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#C9974A',
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS station_category_map (
  station_id uuid REFERENCES kitchen_stations(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (station_id, category_id)
);

ALTER TABLE kitchen_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_category_map ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin can manage stations" ON kitchen_stations;
CREATE POLICY "admin can manage stations" ON kitchen_stations
  FOR ALL USING (has_permission('manage_roles'));

DROP POLICY IF EXISTS "kitchen can view stations" ON kitchen_stations;
CREATE POLICY "kitchen can view stations" ON kitchen_stations
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin can manage station map" ON station_category_map;
CREATE POLICY "admin can manage station map" ON station_category_map
  FOR ALL USING (has_permission('manage_roles'));

DROP POLICY IF EXISTS "kitchen can view station map" ON station_category_map;
CREATE POLICY "kitchen can view station map" ON station_category_map
  FOR SELECT USING (true);

-- Seed default stations
INSERT INTO kitchen_stations (name, color, sort_order) VALUES
  ('Tandoor & Grill',  '#ef4444', 1),
  ('Curries & Gravy',  '#f97316', 2),
  ('Biriyani & Mandi', '#eab308', 3),
  ('Starters',         '#22c55e', 4),
  ('Breads & Naan',    '#a78bfa', 5),
  ('Beverages',        '#3b82f6', 6),
  ('Desserts',         '#ec4899', 7)
ON CONFLICT (name) DO NOTHING;

-- Map categories to stations
INSERT INTO station_category_map (station_id, category_id)
SELECT s.id, c.id FROM kitchen_stations s, categories c
WHERE s.name = 'Tandoor & Grill'
  AND c.name IN ('Tandoori','Barbeque','Shawarma')
ON CONFLICT DO NOTHING;

INSERT INTO station_category_map (station_id, category_id)
SELECT s.id, c.id FROM kitchen_stations s, categories c
WHERE s.name = 'Curries & Gravy'
  AND c.name IN ('Chicken Gravy','Mutton Gravy','Veg Gravy','Egg Dishes','Sea Food')
ON CONFLICT DO NOTHING;

INSERT INTO station_category_map (station_id, category_id)
SELECT s.id, c.id FROM kitchen_stations s, categories c
WHERE s.name = 'Biriyani & Mandi'
  AND c.name IN ('Biriyani','Kuzhimandi','Briyani','Rice & Noodles')
ON CONFLICT DO NOTHING;

INSERT INTO station_category_map (station_id, category_id)
SELECT s.id, c.id FROM kitchen_stations s, categories c
WHERE s.name = 'Starters'
  AND c.name IN ('Soups','Salads','Starters','Chinese','Soup','Sandwiches')
ON CONFLICT DO NOTHING;

INSERT INTO station_category_map (station_id, category_id)
SELECT s.id, c.id FROM kitchen_stations s, categories c
WHERE s.name = 'Breads & Naan'
  AND c.name IN ('Paratha & Breads')
ON CONFLICT DO NOTHING;

INSERT INTO station_category_map (station_id, category_id)
SELECT s.id, c.id FROM kitchen_stations s, categories c
WHERE s.name = 'Beverages'
  AND c.name IN ('Drinks','Milkshakes','Ice Creams','Curd & Raitha','Milk Shake')
ON CONFLICT DO NOTHING;

INSERT INTO station_category_map (station_id, category_id)
SELECT s.id, c.id FROM kitchen_stations s, categories c
WHERE s.name = 'Desserts'
  AND c.name IN ('Desserts','Dessert','Ice Cream','Ice Creams')
ON CONFLICT DO NOTHING;

-- Station routing toggle
ALTER TABLE restaurant_settings
  ADD COLUMN IF NOT EXISTS station_routing_enabled boolean NOT NULL DEFAULT false;

-- KOT item status table
CREATE TABLE IF NOT EXISTS order_item_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid REFERENCES order_items(id) ON DELETE CASCADE,
  is_done boolean NOT NULL DEFAULT false,
  marked_by uuid REFERENCES staff_users(id),
  marked_at timestamptz DEFAULT now(),
  UNIQUE(order_item_id)
);
ALTER TABLE order_item_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kitchen can manage item status" ON order_item_status;
CREATE POLICY "kitchen can manage item status" ON order_item_status
  FOR ALL USING (true);

-- Fix status enum
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'pending','confirmed','preparing','ready',
    'served','billed','cancelled','on_hold'
  ));
