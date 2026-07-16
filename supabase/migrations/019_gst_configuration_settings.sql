-- Add GST configuration columns to restaurant_settings table
ALTER TABLE public.restaurant_settings
ADD COLUMN IF NOT EXISTS legal_business_name text DEFAULT 'Hotel Taj Ooty',
ADD COLUMN IF NOT EXISTS trade_name text DEFAULT 'Hotel Taj',
ADD COLUMN IF NOT EXISTS gstin text DEFAULT '',
ADD COLUMN IF NOT EXISTS tax_scheme text DEFAULT 'Regular Scheme (5% GST No ITC)',
ADD COLUMN IF NOT EXISTS registration_state text DEFAULT 'Tamil Nadu',
ADD COLUMN IF NOT EXISTS default_hsn_code text DEFAULT '996331',
ADD COLUMN IF NOT EXISTS enable_ecommerce_tax boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pricing_strategy text DEFAULT 'exclusive',
ADD COLUMN IF NOT EXISTS print_gstin_bill boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS print_cgst_sgst_split boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS print_hsn_items boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS print_customer_gstin boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS aggregator_mappings jsonb DEFAULT '[
  {"name": "Swiggy", "gstin": "", "liability": "Aggregator Pays (Sec 9(5))", "prefix": "SWG-"},
  {"name": "Zomato", "gstin": "", "liability": "Aggregator Pays (Sec 9(5))", "prefix": "ZOM-"},
  {"name": "Direct Delivery", "gstin": "N/A", "liability": "Restaurant Pays", "prefix": "DEL-"}
]'::jsonb;
