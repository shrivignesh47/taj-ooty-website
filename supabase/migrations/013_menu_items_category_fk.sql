-- Add foreign key constraint linking menu_items to categories
ALTER TABLE public.menu_items
ADD CONSTRAINT fk_menu_items_categories
FOREIGN KEY (category_id) REFERENCES public.categories(id)
ON DELETE SET NULL;
