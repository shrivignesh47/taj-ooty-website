-- Add loyalty settings to restaurant_settings
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS loyalty_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS loyalty_points_per_rupee numeric(5,2) DEFAULT 1;
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS loyalty_redemption_rate numeric(5,2) DEFAULT 0.5;

-- Create customer_loyalty table
CREATE TABLE IF NOT EXISTS customer_loyalty (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone text NOT NULL UNIQUE,
  customer_name text,
  points_balance numeric(10,2) NOT NULL DEFAULT 0,
  lifetime_points_earned numeric(10,2) NOT NULL DEFAULT 0,
  lifetime_visits int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE customer_loyalty ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff can manage loyalty" ON customer_loyalty;
CREATE POLICY "staff can manage loyalty" ON customer_loyalty
  FOR ALL USING (has_permission('view_billing') OR has_permission('generate_bills') OR has_permission('manage_staff'));

-- Create loyalty_transactions table
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone text NOT NULL REFERENCES customer_loyalty(customer_phone),
  bill_id uuid REFERENCES bills(id),
  type text NOT NULL CHECK (type IN ('earned','redeemed','adjusted')),
  points numeric(10,2) NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff can view loyalty transactions" ON loyalty_transactions;
CREATE POLICY "staff can view loyalty transactions" ON loyalty_transactions
  FOR SELECT USING (has_permission('view_billing') OR has_permission('generate_bills'));

DROP POLICY IF EXISTS "staff can insert loyalty transactions" ON loyalty_transactions;
CREATE POLICY "staff can insert loyalty transactions" ON loyalty_transactions
  FOR INSERT WITH CHECK (has_permission('generate_bills'));
