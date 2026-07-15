-- ============================================================
-- 007_rls_permission_based.sql
-- Drop ALL existing RLS policies and recreate them using
-- has_permission() checks ONLY - no hardcoded role names.
-- Run this in Supabase Studio SQL Editor.
-- ============================================================

-- orders
DROP POLICY IF EXISTS "public can view own order by id" ON public.orders;
DROP POLICY IF EXISTS "public can create orders" ON public.orders;
DROP POLICY IF EXISTS "staff with view_orders can view all orders" ON public.orders;
DROP POLICY IF EXISTS "staff with edit_orders can update orders" ON public.orders;
DROP POLICY IF EXISTS "staff can view orders" ON public.orders;
DROP POLICY IF EXISTS "staff can update orders" ON public.orders;

CREATE POLICY "public can create orders" ON public.orders
    FOR INSERT WITH CHECK (true);

CREATE POLICY "public can view own order by id" ON public.orders
    FOR SELECT USING (true);

CREATE POLICY "staff can update orders" ON public.orders
    FOR UPDATE USING (
        has_permission('edit_orders') OR
        has_permission('confirm_orders') OR
        has_permission('update_prep_status')
    );

-- order_items
DROP POLICY IF EXISTS "public can add order items on creation" ON public.order_items;
DROP POLICY IF EXISTS "public can view order items" ON public.order_items;
DROP POLICY IF EXISTS "staff can manage order items" ON public.order_items;

CREATE POLICY "public can add order items on creation" ON public.order_items
    FOR INSERT WITH CHECK (true);

CREATE POLICY "public can view order items" ON public.order_items
    FOR SELECT USING (true);

CREATE POLICY "staff can manage order items" ON public.order_items
    FOR ALL USING (
        has_permission('edit_orders') OR
        has_permission('confirm_orders') OR
        has_permission('update_prep_status') OR
        has_permission('manage_orders')
    );

-- bills
DROP POLICY IF EXISTS "staff with generate_bills can manage bills" ON public.bills;
DROP POLICY IF EXISTS "staff can view bills" ON public.bills;
DROP POLICY IF EXISTS "staff can manage bills" ON public.bills;

CREATE POLICY "staff can view bills" ON public.bills
    FOR SELECT USING (
        has_permission('view_billing') OR
        has_permission('generate_bills') OR
        has_permission('view_revenue') OR
        has_permission('manage_staff')
    );

CREATE POLICY "staff can manage bills" ON public.bills
    FOR ALL USING (
        has_permission('generate_bills') OR
        has_permission('view_billing') OR
        has_permission('manage_staff')
    );

-- restaurant_tables
DROP POLICY IF EXISTS "staff can manage tables" ON public.restaurant_tables;
DROP POLICY IF EXISTS "all staff can view tables" ON public.restaurant_tables;
DROP POLICY IF EXISTS "staff with manage_tables can modify tables" ON public.restaurant_tables;

CREATE POLICY "all staff can view tables" ON public.restaurant_tables
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "staff with manage_tables can modify tables" ON public.restaurant_tables
    FOR ALL USING (
        has_permission('manage_tables') OR
        has_permission('manage_staff')
    );

-- order_status_history
ALTER TABLE IF EXISTS public.order_status_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff can view order history" ON public.order_status_history;
DROP POLICY IF EXISTS "staff can log order history" ON public.order_status_history;

CREATE POLICY "staff can view order history" ON public.order_status_history
    FOR SELECT USING (
        has_permission('view_orders') OR
        has_permission('confirm_orders') OR
        has_permission('view_kitchen_queue') OR
        has_permission('update_prep_status') OR
        has_permission('view_billing') OR
        has_permission('view_revenue') OR
        has_permission('manage_staff')
    );

CREATE POLICY "staff can log order history" ON public.order_status_history
    FOR INSERT WITH CHECK (true);

-- menu_items
DROP POLICY IF EXISTS "public can view available menu items" ON public.menu_items;
DROP POLICY IF EXISTS "staff with edit_menu can manage menu" ON public.menu_items;
DROP POLICY IF EXISTS "staff can view all menu items" ON public.menu_items;

CREATE POLICY "public can view available menu items" ON public.menu_items
    FOR SELECT USING (is_available = true);

CREATE POLICY "staff can view all menu items" ON public.menu_items
    FOR SELECT USING (
        has_permission('edit_menu') OR
        has_permission('view_revenue') OR
        has_permission('manage_staff')
    );

CREATE POLICY "staff with edit_menu can manage menu" ON public.menu_items
    FOR ALL USING (has_permission('edit_menu'));

-- categories
DROP POLICY IF EXISTS "public can view categories" ON public.categories;
DROP POLICY IF EXISTS "staff can manage categories" ON public.categories;

CREATE POLICY "public can view categories" ON public.categories
    FOR SELECT USING (true);

CREATE POLICY "staff can manage categories" ON public.categories
    FOR ALL USING (has_permission('edit_menu'));

-- roles
DROP POLICY IF EXISTS "staff with manage_roles can manage roles" ON public.roles;
DROP POLICY IF EXISTS "authenticated users can view roles" ON public.roles;

CREATE POLICY "authenticated users can view roles" ON public.roles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "staff with manage_roles can manage roles" ON public.roles
    FOR ALL USING (has_permission('manage_roles'));

-- role_permissions
DROP POLICY IF EXISTS "authenticated users can view role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "staff can manage role_permissions" ON public.role_permissions;

CREATE POLICY "authenticated users can view role_permissions" ON public.role_permissions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "staff can manage role_permissions" ON public.role_permissions
    FOR ALL USING (has_permission('manage_roles'));

-- permissions
DROP POLICY IF EXISTS "authenticated users can view permissions" ON public.permissions;
DROP POLICY IF EXISTS "staff can manage permissions" ON public.permissions;

CREATE POLICY "authenticated users can view permissions" ON public.permissions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "staff can manage permissions" ON public.permissions
    FOR ALL USING (has_permission('manage_roles'));

-- staff_users
DROP POLICY IF EXISTS "staff with manage_staff can manage staff" ON public.staff_users;
DROP POLICY IF EXISTS "staff users can view their own profile" ON public.staff_users;
DROP POLICY IF EXISTS "staff can view all staff" ON public.staff_users;

CREATE POLICY "staff users can view their own profile" ON public.staff_users
    FOR SELECT TO authenticated USING (auth_id = auth.uid());

CREATE POLICY "staff can view all staff" ON public.staff_users
    FOR SELECT USING (has_permission('manage_staff'));

CREATE POLICY "staff with manage_staff can manage staff" ON public.staff_users
    FOR ALL USING (has_permission('manage_staff'));

SELECT 'RLS policies updated successfully - all using has_permission() checks.' AS result;
