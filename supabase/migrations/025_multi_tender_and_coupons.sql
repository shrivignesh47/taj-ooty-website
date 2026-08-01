-- Migration 024: Multi-Tender Bill Payments and Database-Driven Coupons

-- 1. Multi-Tender Payments Table
CREATE TABLE IF NOT EXISTS public.bill_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id uuid REFERENCES public.bills(id) ON DELETE CASCADE,
  payment_method text NOT NULL CHECK (payment_method IN ('cash','card','upi')),
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bill_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff can manage bill payments" ON public.bill_payments;
CREATE POLICY "staff can manage bill payments" ON public.bill_payments
  FOR ALL USING (has_permission('generate_bills') OR has_permission('view_billing'));

-- 2. Update bills payment_method check constraint to accept 'split'
ALTER TABLE public.bills DROP CONSTRAINT IF EXISTS bills_payment_method_check;
ALTER TABLE public.bills ADD CONSTRAINT bills_payment_method_check
  CHECK (payment_method IN ('cash','card','upi','split'));

-- 3. Dynamic Coupons Table
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

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff can view active coupons" ON public.coupons;
CREATE POLICY "staff can view active coupons" ON public.coupons
  FOR SELECT USING (has_permission('generate_bills') OR has_permission('view_billing'));

DROP POLICY IF EXISTS "admin can manage coupons" ON public.coupons;
CREATE POLICY "admin can manage coupons" ON public.coupons
  FOR ALL USING (has_permission('manage_staff'));

-- Seed preset coupons
INSERT INTO public.coupons (code, type, value, description) VALUES
  ('TAJ10', 'pct', 10, '10% Restaurant Special'),
  ('WELCOME50', 'amt', 50, '₹50 Flat Welcome Discount'),
  ('FESTIVE15', 'pct', 15, '15% Festive Occasion Discount'),
  ('VIP200', 'amt', 200, '₹200 Flat VIP Discount')
ON CONFLICT (code) DO NOTHING;
