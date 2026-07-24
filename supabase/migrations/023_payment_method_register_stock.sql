-- ============================================================
-- 023_payment_method_register_stock.sql
-- Fix 1: Real payment method on bills
-- Fix 2: Persistent cash register + petty expenses tables
-- Fix 3: DB-level stock enforcement trigger
-- Fix 5: Missing permission keys
-- ============================================================

-- FIX 1: Add payment_method to bills table
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS payment_method text
  DEFAULT 'cash'
  CHECK (payment_method IN ('cash', 'card', 'upi'));

-- FIX 2a: Cash Register Sessions table
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
ALTER TABLE public.cash_register_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cashier can manage own register" ON public.cash_register_sessions;
CREATE POLICY "cashier can manage own register" ON public.cash_register_sessions
  FOR ALL USING (
    has_permission('view_billing') OR has_permission('generate_bills') OR has_permission('manage_staff')
  );

-- FIX 2b: Petty Expenses table
CREATE TABLE IF NOT EXISTS public.petty_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  register_session_id uuid REFERENCES public.cash_register_sessions(id) ON DELETE SET NULL,
  description text NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  recorded_by uuid REFERENCES public.staff_users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.petty_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cashier can manage expenses" ON public.petty_expenses;
CREATE POLICY "cashier can manage expenses" ON public.petty_expenses
  FOR ALL USING (
    has_permission('view_billing') OR has_permission('generate_bills') OR has_permission('manage_staff')
  );

-- FIX 3: Stock decrement trigger on order_items INSERT
CREATE OR REPLACE FUNCTION public.check_and_decrement_stock()
RETURNS TRIGGER AS $$
DECLARE
  item_name text;
BEGIN
  -- Only enforce if stock_qty is set (not NULL = unlimited)
  IF EXISTS (
    SELECT 1 FROM public.menu_items
    WHERE id = NEW.menu_item_id AND stock_qty IS NOT NULL
  ) THEN
    -- Atomically decrement stock; WHERE clause prevents overselling
    UPDATE public.menu_items
    SET stock_qty = stock_qty - NEW.qty
    WHERE id = NEW.menu_item_id
      AND stock_qty >= NEW.qty;

    IF NOT FOUND THEN
      -- Get item name for user-friendly error message
      SELECT name INTO item_name FROM public.menu_items WHERE id = NEW.menu_item_id;
      RAISE EXCEPTION 'STOCK_EXHAUSTED:% just sold out. Please remove it and try again.', COALESCE(item_name, 'This item');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists before recreating
DROP TRIGGER IF EXISTS trg_check_stock_on_order_item ON public.order_items;

CREATE TRIGGER trg_check_stock_on_order_item
  BEFORE INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.check_and_decrement_stock();

-- FIX 5: Add missing permission keys (manage_cash_drawer, manage_expenses)
-- These were checked in UI but missing from the permissions table
INSERT INTO public.permissions (key) VALUES
  ('manage_cash_drawer'),
  ('manage_expenses')
ON CONFLICT DO NOTHING;

-- Grant manage_cash_drawer and manage_expenses to cashier and admin roles
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name IN ('cashier', 'admin')
  AND p.key IN ('manage_cash_drawer', 'manage_expenses')
ON CONFLICT DO NOTHING;

SELECT 'Migration 023 applied: payment_method, register sessions, petty expenses, stock trigger, permission keys.' AS result;
