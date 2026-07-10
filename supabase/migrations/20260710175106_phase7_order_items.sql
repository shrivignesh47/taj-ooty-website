-- Migration to add status column to order_items for item-level kitchen tracking
ALTER TABLE order_items
ADD COLUMN status text NOT NULL DEFAULT 'pending'
CHECK (status IN ('pending', 'preparing', 'ready', 'served', 'cancelled'));

-- Ensure orders status constraint allows 'cancelled'
-- (It might already, but this ensures it is exactly correct for the new features)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'served', 'billed', 'cancelled'));
