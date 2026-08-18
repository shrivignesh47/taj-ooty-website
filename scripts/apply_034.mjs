// Apply migration 034 using the project's Supabase service role key
// Usage: node scripts/apply_034.mjs

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const statements = [
  `ALTER TABLE public.restaurant_settings ADD COLUMN IF NOT EXISTS gst_rate numeric(5,2) NOT NULL DEFAULT 5`,
  `ALTER TABLE public.restaurant_settings ADD COLUMN IF NOT EXISTS is_gst_inclusive boolean NOT NULL DEFAULT false`,
  `ALTER TABLE public.restaurant_settings ADD COLUMN IF NOT EXISTS service_charge_rate numeric(5,2) NOT NULL DEFAULT 0`,
  `ALTER TABLE public.restaurant_settings ADD COLUMN IF NOT EXISTS charge_service_tax boolean NOT NULL DEFAULT false`,
  `INSERT INTO public.permissions (key) VALUES ('apply_discount') ON CONFLICT DO NOTHING`,
  `INSERT INTO public.permissions (key) VALUES ('view_reports') ON CONFLICT DO NOTHING`,
  `INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name IN ('cashier', 'admin') AND p.key = 'apply_discount' ON CONFLICT DO NOTHING`,
  `INSERT INTO public.role_permissions (role_id, permission_id) SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.name IN ('cashier', 'admin') AND p.key = 'view_reports' ON CONFLICT DO NOTHING`,
];

let ok = 0, fail = 0;
for (const sql of statements) {
  const res = await supabase.rpc('pg_execute', { query: sql }).catch(() => null);
  if (res?.error) {
    console.error('FAILED:', sql.slice(0, 80), '\n', res.error.message);
    fail++;
  } else {
    console.log('OK:', sql.slice(0, 80));
    ok++;
  }
}

console.log(`\nDone: ${ok} OK, ${fail} failed`);

// Verify columns exist
const { data: cols, error: e2 } = await supabase
  .from('restaurant_settings')
  .select('gst_rate, is_gst_inclusive, service_charge_rate, charge_service_tax')
  .limit(1);

if (e2) {
  console.log('\nColumn verification FAILED:', e2.message);
} else {
  console.log('\nColumn verification OK:', cols);
}

const { data: newPerms } = await supabase
  .from('permissions')
  .select('key')
  .in('key', ['apply_discount', 'view_reports']);
console.log('New permissions found:', newPerms);
