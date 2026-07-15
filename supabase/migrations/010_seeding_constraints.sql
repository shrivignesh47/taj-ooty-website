-- 010_seeding_constraints.sql
-- Add UNIQUE constraints to allow ON CONFLICT clauses in seed.sql to work properly

-- 1. unique constraint on roles(name)
ALTER TABLE public.roles DROP CONSTRAINT IF EXISTS roles_name_unique;
ALTER TABLE public.roles ADD CONSTRAINT roles_name_unique UNIQUE (name);

-- 2. unique constraint on permissions(key)
ALTER TABLE public.permissions DROP CONSTRAINT IF EXISTS permissions_key_unique;
ALTER TABLE public.permissions ADD CONSTRAINT permissions_key_unique UNIQUE (key);

-- 3. unique constraint on categories(name)
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_name_unique;
ALTER TABLE public.categories ADD CONSTRAINT categories_name_unique UNIQUE (name);

-- 4. unique constraint on restaurant_tables(table_no)
ALTER TABLE public.restaurant_tables DROP CONSTRAINT IF EXISTS restaurant_tables_table_no_unique;
ALTER TABLE public.restaurant_tables ADD CONSTRAINT restaurant_tables_table_no_unique UNIQUE (table_no);
