-- ============================================================================
-- TajPOS - Full Database Schema for Local PostgreSQL 16
-- Converted from supabase/migrations/ (000 -> 036)
-- No Supabase, no Docker, no cloud. Plain PostgreSQL only.
-- ============================================================================

-- 1. Extensions --------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Functions ---------------------------------------------------------------

-- Core RBAC. Joins staff_users -> role_permissions -> permissions.
-- Uses current_setting('app.current_user_id') instead of auth.uid().
CREATE OR REPLACE FUNCTION "public"."has_permission"("perm_key" "text") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from staff_users su
    join role_permissions rp on rp.role_id = su.role_id
    join permissions p on p.id = rp.permission_id
    where su.auth_id = current_setting('app.current_user_id', true)::uuid
      and p.key = perm_key
      and su.is_active = true
  );
$$;

-- Auto-enable RLS on every new public schema table (event trigger function).
CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;

-- Atomically decrements stock_qty on order_items INSERT. Raises STOCK_EXHAUSTED.
CREATE OR REPLACE FUNCTION public.check_and_decrement_stock()
RETURNS TRIGGER AS $$
DECLARE
  item_name text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.menu_items
    WHERE id = NEW.menu_item_id AND stock_qty IS NOT NULL
  ) THEN
    UPDATE public.menu_items
    SET stock_qty = stock_qty - NEW.qty
    WHERE id = NEW.menu_item_id
      AND stock_qty >= NEW.qty;

    IF NOT FOUND THEN
      SELECT name INTO item_name FROM public.menu_items WHERE id = NEW.menu_item_id;
      RAISE EXCEPTION 'STOCK_EXHAUSTED:% just sold out. Please remove it and try again.', COALESCE(item_name, 'This item');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restores menu_items stock_qty when an order status is updated to 'cancelled'.
CREATE OR REPLACE FUNCTION public.refund_stock_on_cancel()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    UPDATE public.menu_items mi
    SET stock_qty = mi.stock_qty + oi.qty
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id
      AND oi.menu_item_id = mi.id
      AND mi.stock_qty IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Tables (in dependency order) --------------------------------------------

-- roles
CREATE TABLE IF NOT EXISTS public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    is_custom boolean DEFAULT false NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT roles_pkey PRIMARY KEY (id),
    CONSTRAINT roles_name_unique UNIQUE (name)
);

-- permissions
CREATE TABLE IF NOT EXISTS public.permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    CONSTRAINT permissions_pkey PRIMARY KEY (id),
    CONSTRAINT permissions_key_unique UNIQUE (key)
);

-- role_permissions
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_permissions_roles FOREIGN KEY (role_id)
      REFERENCES public.roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permissions FOREIGN KEY (permission_id)
      REFERENCES public.permissions(id) ON DELETE CASCADE
);

-- staff_users
CREATE TABLE IF NOT EXISTS public.staff_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    auth_id uuid UNIQUE,
    name text NOT NULL,
    phone text,
    role_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT staff_users_pkey PRIMARY KEY (id),
    CONSTRAINT fk_staff_users_roles FOREIGN KEY (role_id)
      REFERENCES public.roles(id) ON DELETE SET NULL
);

-- categories
CREATE TABLE IF NOT EXISTS public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    CONSTRAINT categories_pkey PRIMARY KEY (id),
    CONSTRAINT categories_name_unique UNIQUE (name)
);

-- menu_items
CREATE TABLE IF NOT EXISTS public.menu_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id uuid,
    name text NOT NULL,
    price numeric(10,2) NOT NULL,
    image_url text,
    is_available boolean DEFAULT true NOT NULL,
    is_veg boolean NOT NULL DEFAULT false,
    stock_qty integer DEFAULT NULL,
    CONSTRAINT menu_items_pkey PRIMARY KEY (id),
    CONSTRAINT fk_menu_items_categories FOREIGN KEY (category_id)
      REFERENCES public.categories(id) ON DELETE SET NULL
);

-- restaurant_tables
CREATE TABLE IF NOT EXISTS public.restaurant_tables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_no integer NOT NULL,
    qr_code_url text,
    assigned_waiter_id uuid,
    CONSTRAINT restaurant_tables_pkey PRIMARY KEY (id),
    CONSTRAINT restaurant_tables_table_no_unique UNIQUE (table_no)
);

-- orders
CREATE TABLE IF NOT EXISTS public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_id uuid,
    customer_name text NOT NULL,
    customer_phone text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    waiter_id uuid,
    created_at timestamptz DEFAULT now() NOT NULL,
    source text NOT NULL DEFAULT 'dine_in',
    token_no text,
    idempotency_key text UNIQUE,
    CONSTRAINT orders_pkey PRIMARY KEY (id),
    CONSTRAINT orders_status_check CHECK (status IN (
      'pending','confirmed','preparing','ready',
      'served','billed','cancelled','on_hold'
    )),
    CONSTRAINT fk_orders_restaurant_tables FOREIGN KEY (table_id)
      REFERENCES public.restaurant_tables(id) ON DELETE SET NULL
);

-- order_items
CREATE TABLE IF NOT EXISTS public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid,
    menu_item_id uuid,
    qty integer NOT NULL,
    notes text,
    price_at_order numeric(10,2) NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    discount_percent numeric(5,2) DEFAULT 0,
    discount_reason text,
    CONSTRAINT order_items_pkey PRIMARY KEY (id),
    CONSTRAINT order_items_qty_check CHECK ((qty > 0)),
    CONSTRAINT order_items_status_check CHECK (status IN ('pending', 'preparing', 'ready', 'served', 'cancelled')),
    CONSTRAINT fk_order_items_orders FOREIGN KEY (order_id)
      REFERENCES public.orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_menu_items FOREIGN KEY (menu_item_id)
      REFERENCES public.menu_items(id) ON DELETE CASCADE
);

-- order_status_history
CREATE TABLE IF NOT EXISTS public.order_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid,
    status text NOT NULL,
    changed_by uuid,
    changed_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT order_status_history_pkey PRIMARY KEY (id),
    CONSTRAINT fk_order_status_history_orders FOREIGN KEY (order_id)
      REFERENCES public.orders(id) ON DELETE CASCADE
);

-- bills
CREATE TABLE IF NOT EXISTS public.bills (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid,
    total numeric(10,2) NOT NULL,
    cashier_id uuid,
    paid_at timestamptz,
    payment_method text DEFAULT 'cash',
    CONSTRAINT bills_pkey PRIMARY KEY (id),
    CONSTRAINT bills_payment_method_check CHECK (payment_method IN ('cash','card','upi','split'))
);

-- restaurant_settings (single-row config)
CREATE TABLE IF NOT EXISTS public.restaurant_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_name text NOT NULL DEFAULT 'Hotel Taj Ooty',
    gst_number text,
    fssai_number text,
    address text,
    phone text,
    email text,
    website text,
    service_charge_percent numeric(5,2) DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now(),
    auto_print_on_accept boolean DEFAULT false,
    printer_name text,
    print_kot boolean DEFAULT true,
    print_bill boolean DEFAULT true,
    kds_config jsonb,
    station_routing_enabled boolean NOT NULL DEFAULT false,
    swiggy_enabled boolean NOT NULL DEFAULT false,
    zomato_enabled boolean NOT NULL DEFAULT false,
    swiggy_merchant_id text DEFAULT '',
    zomato_merchant_id text DEFAULT '',
    legal_business_name text DEFAULT 'Hotel Taj Ooty',
    trade_name text DEFAULT 'Hotel Taj',
    gstin text DEFAULT '',
    tax_scheme text DEFAULT 'Regular Scheme (5% GST No ITC)',
    registration_state text DEFAULT 'Tamil Nadu',
    default_hsn_code text DEFAULT '996331',
    enable_ecommerce_tax boolean DEFAULT false,
    pricing_strategy text DEFAULT 'exclusive',
    print_gstin_bill boolean DEFAULT true,
    print_cgst_sgst_split boolean DEFAULT true,
    print_hsn_items boolean DEFAULT true,
    print_customer_gstin boolean DEFAULT true,
    aggregator_mappings jsonb DEFAULT '[
  {"name": "Swiggy", "gstin": "", "liability": "Aggregator Pays (Sec 9(5))", "prefix": "SWG-"},
  {"name": "Zomato", "gstin": "", "liability": "Aggregator Pays (Sec 9(5))", "prefix": "ZOM-"},
  {"name": "Direct Delivery", "gstin": "N/A", "liability": "Restaurant Pays", "prefix": "DEL-"}
]'::jsonb,
    use_browser_fallback boolean DEFAULT true,
    loyalty_enabled boolean NOT NULL DEFAULT true,
    loyalty_points_per_rupee numeric(5,2) DEFAULT 1,
    loyalty_redemption_rate numeric(5,2) DEFAULT 0.5,
    gst_rate numeric(5,2) NOT NULL DEFAULT 5,
    is_gst_inclusive boolean NOT NULL DEFAULT false,
    service_charge_rate numeric(5,2) NOT NULL DEFAULT 0,
    charge_service_tax boolean NOT NULL DEFAULT false,
    footer_note text DEFAULT 'Thank you! Visit again.',
    CONSTRAINT restaurant_settings_pkey PRIMARY KEY (id)
);

-- kitchen_stations
CREATE TABLE IF NOT EXISTS public.kitchen_stations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL UNIQUE,
    color text NOT NULL DEFAULT '#C9974A',
    is_active boolean NOT NULL DEFAULT true,
    sort_order int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT kitchen_stations_pkey PRIMARY KEY (id)
);

-- station_category_map
CREATE TABLE IF NOT EXISTS public.station_category_map (
    station_id uuid REFERENCES public.kitchen_stations(id) ON DELETE CASCADE,
    category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
    CONSTRAINT station_category_map_pkey PRIMARY KEY (station_id, category_id)
);

-- order_item_status (KDS per-item tracking)
CREATE TABLE IF NOT EXISTS public.order_item_status (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_item_id uuid REFERENCES public.order_items(id) ON DELETE CASCADE,
    is_done boolean NOT NULL DEFAULT false,
    marked_by uuid REFERENCES public.staff_users(id),
    marked_at timestamptz DEFAULT now(),
    CONSTRAINT order_item_status_pkey PRIMARY KEY (id),
    CONSTRAINT order_item_status_order_item_id_key UNIQUE (order_item_id)
);

-- staff_activity_log
CREATE TABLE IF NOT EXISTS public.staff_activity_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id uuid REFERENCES public.staff_users(id) ON DELETE SET NULL,
    action text NOT NULL,
    details jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- staff_attendance
CREATE TABLE IF NOT EXISTS public.staff_attendance (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id uuid REFERENCES public.staff_users(id) ON DELETE CASCADE,
    clock_in timestamptz DEFAULT now() NOT NULL,
    clock_out timestamptz,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- cash_register_sessions
CREATE TABLE IF NOT EXISTS public.cash_register_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cashier_id uuid REFERENCES public.staff_users(id),
    opening_float numeric(10,2) NOT NULL DEFAULT 0,
    closing_amount numeric(10,2),
    opened_at timestamptz NOT NULL DEFAULT now(),
    closed_at timestamptz,
    status text NOT NULL DEFAULT 'open'
      CHECK (status IN ('open', 'closed'))
);

-- petty_expenses
CREATE TABLE IF NOT EXISTS public.petty_expenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    register_session_id uuid REFERENCES public.cash_register_sessions(id) ON DELETE SET NULL,
    description text NOT NULL,
    amount numeric(10,2) NOT NULL CHECK (amount > 0),
    recorded_by uuid REFERENCES public.staff_users(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- bill_payments (multi-tender splits)
CREATE TABLE IF NOT EXISTS public.bill_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id uuid REFERENCES public.bills(id) ON DELETE CASCADE,
    payment_method text NOT NULL CHECK (payment_method IN ('cash','card','upi')),
    amount numeric(10,2) NOT NULL CHECK (amount > 0),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- coupons
CREATE TABLE IF NOT EXISTS public.coupons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    type text NOT NULL CHECK (type IN ('pct','amt')),
    value numeric(10,2) NOT NULL,
    description text,
    is_active boolean NOT NULL DEFAULT true,
    valid_from timestamptz DEFAULT now(),
    valid_until timestamptz,
    usage_limit int,
    times_used int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- customer_loyalty
CREATE TABLE IF NOT EXISTS public.customer_loyalty (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_phone text NOT NULL UNIQUE,
    customer_name text,
    points_balance numeric(10,2) NOT NULL DEFAULT 0,
    lifetime_points_earned numeric(10,2) NOT NULL DEFAULT 0,
    lifetime_visits int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- loyalty_transactions
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_phone text NOT NULL REFERENCES public.customer_loyalty(customer_phone),
    bill_id uuid REFERENCES public.bills(id),
    type text NOT NULL CHECK (type IN ('earned','redeemed','adjusted')),
    points numeric(10,2) NOT NULL,
    note text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- dashboard_preferences
CREATE TABLE IF NOT EXISTS public.dashboard_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id uuid REFERENCES public.staff_users(id) ON DELETE CASCADE UNIQUE,
    visible_widgets jsonb NOT NULL DEFAULT '[]',
    widget_order jsonb NOT NULL DEFAULT '[]',
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- staff_notifications
CREATE TABLE IF NOT EXISTS public.staff_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_name TEXT NOT NULL,
    sender_role TEXT DEFAULT 'Staff',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    target_role TEXT DEFAULT 'all',
    priority TEXT DEFAULT 'normal',
    read_by JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Indexes -----------------------------------------------------------------

-- Ensure only one active (non-billed, non-cancelled) order per table at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_order_per_table
  ON public.orders (table_id)
  WHERE status NOT IN ('billed', 'cancelled');

-- 5. Triggers ----------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_check_stock_on_order_item ON public.order_items;

CREATE TRIGGER trg_check_stock_on_order_item
  BEFORE INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.check_and_decrement_stock();

DROP TRIGGER IF EXISTS trg_refund_stock_on_cancel ON public.orders;

CREATE TRIGGER trg_refund_stock_on_cancel
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.refund_stock_on_cancel();

-- 6. Event triggers ----------------------------------------------------------

DO $$
BEGIN
  CREATE EVENT TRIGGER rls_auto_enable ON ddl_command_end
    WHEN TAG IN ('CREATE TABLE','CREATE TABLE AS','SELECT INTO')
    EXECUTE FUNCTION public.rls_auto_enable();
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'Skipping rls_auto_enable event trigger (requires superuser)';
END $$;

-- 7. Local auth table --------------------------------------------------------

-- Local auth table replaces Supabase Auth for Windows installation
CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  staff_id uuid REFERENCES staff_users(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  last_login timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);
CREATE INDEX IF NOT EXISTS idx_app_users_staff_id ON app_users(staff_id);

SELECT 'TajPOS database schema created successfully' AS status;