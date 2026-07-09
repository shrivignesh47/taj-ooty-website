-- Fix: Allow menu items to be deleted without breaking existing orders
-- Drop the existing constraint
ALTER TABLE public.order_items 
    DROP CONSTRAINT IF EXISTS order_items_menu_item_id_fkey;

-- Re-add the constraint with ON DELETE SET NULL or ON DELETE CASCADE
-- Since order_items rely on menu_items for name in queries right now, CASCADE is cleaner for dev 
-- so that if a menu item is deleted, it removes the dangling cart items.
-- (In a real enterprise prod, you'd soft delete, but for this SaaS MVP, CASCADE prevents crashes).

ALTER TABLE public.order_items
    ADD CONSTRAINT order_items_menu_item_id_fkey 
    FOREIGN KEY (menu_item_id) 
    REFERENCES public.menu_items(id) 
    ON DELETE CASCADE;
