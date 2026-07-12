-- Add printing-related settings to restaurant_settings
ALTER TABLE restaurant_settings
ADD COLUMN IF NOT EXISTS auto_print_on_accept boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS printer_name text,
ADD COLUMN IF NOT EXISTS print_kot boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS print_bill boolean DEFAULT true;
