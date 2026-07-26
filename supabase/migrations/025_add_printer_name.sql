-- Add printer_name and use_browser_fallback to restaurant_settings
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS printer_name text DEFAULT NULL;
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS use_browser_fallback boolean DEFAULT true;
