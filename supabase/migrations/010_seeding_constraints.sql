-- 010_seeding_constraints.sql
-- Add UNIQUE constraints to allow ON CONFLICT clauses in seed.sql to work properly

-- 1. unique constraint on roles(name)
DELETE FROM public.roles a USING public.roles b
WHERE a.name = b.name AND a.id::text > b.id::text;

ALTER TABLE public.roles DROP CONSTRAINT IF EXISTS roles_name_unique;
ALTER TABLE public.roles ADD CONSTRAINT roles_name_unique UNIQUE (name);

-- 2. unique constraint on permissions(key)
DELETE FROM public.permissions a USING public.permissions b
WHERE a.key = b.key AND a.id::text > b.id::text;

ALTER TABLE public.permissions DROP CONSTRAINT IF EXISTS permissions_key_unique;
ALTER TABLE public.permissions ADD CONSTRAINT permissions_key_unique UNIQUE (key);

-- 3. unique constraint on categories(name)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'menu_items' AND column_name = 'category_id') THEN
    UPDATE public.menu_items m
    SET category_id = canonical.keep_id
    FROM (
      SELECT name, (array_agg(id ORDER BY id))[1] as keep_id
      FROM public.categories
      GROUP BY name
      HAVING count(*) > 1
    ) canonical
    JOIN public.categories c ON c.name = canonical.name
    WHERE m.category_id = c.id AND c.id <> canonical.keep_id;
  END IF;
END $$;

DELETE FROM public.categories a USING public.categories b
WHERE a.name = b.name AND a.id::text > b.id::text;

ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_name_unique;
ALTER TABLE public.categories ADD CONSTRAINT categories_name_unique UNIQUE (name);

-- 4. unique constraint on restaurant_tables(table_no)
DELETE FROM public.restaurant_tables a USING public.restaurant_tables b
WHERE a.table_no = b.table_no AND a.id::text > b.id::text;

ALTER TABLE public.restaurant_tables DROP CONSTRAINT IF EXISTS restaurant_tables_table_no_unique;
ALTER TABLE public.restaurant_tables ADD CONSTRAINT restaurant_tables_table_no_unique UNIQUE (table_no);


