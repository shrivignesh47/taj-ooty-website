-- Veg/non-veg indicator on menu items
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_veg boolean NOT NULL DEFAULT false;

-- Mark veg categories
UPDATE menu_items SET is_veg = true
WHERE category_id IN (
  SELECT id FROM categories
  WHERE name IN ('Soups','Salads','Veg Gravy','Curd & Raitha','Ice Creams','Milkshakes','Drinks')
);

-- Add on_hold status
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending','confirmed','preparing','ready','served','billed','cancelled','on_hold'));

-- KDS config column on restaurant_settings
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS kds_config jsonb;
