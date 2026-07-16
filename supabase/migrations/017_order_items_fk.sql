-- Add foreign key constraint linking order_items to orders
ALTER TABLE public.order_items
ADD CONSTRAINT fk_order_items_orders
FOREIGN KEY (order_id) REFERENCES public.orders(id)
ON DELETE CASCADE;

-- Add foreign key constraint linking order_items to menu_items
ALTER TABLE public.order_items
ADD CONSTRAINT fk_order_items_menu_items
FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id)
ON DELETE CASCADE;
