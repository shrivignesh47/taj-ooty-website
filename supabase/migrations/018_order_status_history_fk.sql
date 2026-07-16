-- Add foreign key constraint linking order_status_history to orders
ALTER TABLE public.order_status_history
ADD CONSTRAINT fk_order_status_history_orders
FOREIGN KEY (order_id) REFERENCES public.orders(id)
ON DELETE CASCADE;
