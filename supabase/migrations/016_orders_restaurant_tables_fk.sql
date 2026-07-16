-- Add foreign key constraint linking orders to restaurant_tables
ALTER TABLE public.orders
ADD CONSTRAINT fk_orders_restaurant_tables
FOREIGN KEY (table_id) REFERENCES public.restaurant_tables(id)
ON DELETE SET NULL;
