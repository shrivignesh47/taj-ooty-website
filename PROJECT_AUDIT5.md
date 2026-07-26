# Project Audit 5 — Taj Ooty Restaurant POS

**Date of Audit:** July 2026

## 1. Production Readiness Verdict
**Verdict: NOT YET**

**Top 3 Reasons:**
1. **TypeScript Build Failures (`tsc --noEmit` fails):** There are 10 TypeScript compilation errors in `AdminStaff.tsx`, `AdminTables.tsx`, `AdminTablesLive.tsx`, `BillingDash.tsx`, and `OrderHistory.tsx`. Automated CI/CD deployment or production build pipelines will fail.
2. **Critical RLS Data Leak:** Migration `024_fix_public_rls_policies.sql` created policy `"public can view specific order by id" ON orders FOR SELECT USING (true);`. This allows any unauthenticated user with the public Anon Key to run `SELECT * FROM orders` and dump all customer names, phone numbers, order histories, and payment totals.
3. **Database Schema Drift & Missing Stock Refund Trigger:** The `idempotency_key` column queried in `submitOrder.ts` is missing from all SQL migration files under `supabase/migrations/`, causing `npx supabase db reset` to fail. Additionally, stock is decremented on order creation but *never restored* when orders are cancelled or items are deleted.

---

## 2. Pros — What's Genuinely Solid
- **Server-Side Security Architecture:** All privileged staff actions (staff management, admin stats, cashier overrides, order status progression) run in Next.js Server Actions using `supabaseAdmin` (`SUPABASE_SERVICE_ROLE_KEY`), keeping secret keys hidden from the client browser bundle.
- **Middleware Access Control:** Server-side middleware (`proxy.ts`) gates all `/staff/*` routes, validating user sessions and roles before serving protected portal pages.
- **Atomic Stock Deduction:** PostgreSQL `trg_check_stock_on_order_item` trigger atomically decrements `stock_qty` and raises an exception (`STOCK_EXHAUSTED:...`) when items sell out, preventing negative stock under high concurrency.
- **High-Aesthetic UI System:** Built with custom Tailwind palette featuring cream (`#F6EEDF`), maroon (`#350C0C`/`#4E1414`), and gold (`#C9974A`) accents, smooth glassmorphism, responsive drawer components, and Framer Motion transitions.

---

## 3. Cons — What's Fragile or Risky
- **Schema & Migration Divergence:** Critical columns used in code (like `idempotency_key`) are missing from SQL migration files.
- **Incomplete Inventory Lifecycle:** Stock decrements on creation but never refunds on order cancellation or item removal.
- **Unhandled Orphaned Orders:** If `orders.insert` succeeds but `order_items.insert` fails due to stock depletion, an empty `orders` row remains orphaned in the database.
- **Excessive Loose Type Casting:** Heavy reliance on `Record<string, unknown>` and `as any` across admin and billing components creates fragile code that breaks on schema changes.

---

## 4. Bugs Found
1. **Compilation Failures in `tsc --noEmit`**
   - **Files:** `src/app/staff/admin/components/AdminStaff.tsx`, `AdminTables.tsx`, `AdminTablesLive.tsx`, `BillingDash.tsx`, `OrderHistory.tsx`
   - **Why:** Mismatched types and unsafe property accesses when handling nested Supabase join responses.
2. **Orphaned Empty Orders on Stock Exhaustion**
   - **File:** `src/features/ordering/actions/submitOrder.ts`
   - **Why:** `orders.insert` creates a `pending` order row first. If `order_items.insert` subsequently throws `STOCK_EXHAUSTED`, the newly created order row is not deleted in the catch block, leaving an empty `orders` row in the database.
3. **Missing `idempotency_key` in Database Migrations**
   - **File:** `supabase/migrations/` (Missing column migration)
   - **Why:** `submitOrder.ts` queries `.eq('idempotency_key', idempotencyKey)`, but `idempotency_key` column was never added in any migration file under `supabase/migrations/`. Running `npx supabase db reset` results in missing column errors.
4. **Missing Stock Restoration on Cancellation / Item Removal**
   - **Files:** `src/features/ordering/actions/waiterActions.ts`, `supabase/migrations/023_payment_method_register_stock.sql`
   - **Why:** DB trigger `trg_check_stock_on_order_item` only decrements stock `BEFORE INSERT`. When an order status is updated to `cancelled` or an item is deleted, stock is never incremented back, causing permanent inventory depletion for cancelled orders.

---

## 5. Logical Errors
1. **Public RLS Policy Allows Dumping All Customer Orders**
   - **File:** `supabase/migrations/024_fix_public_rls_policies.sql`
   - **What happens:** Policy `"public can view specific order by id"` uses `FOR SELECT USING (true)` on `orders` and `order_items`.
   - **What should happen:** Unauthenticated customers should only be able to view their own order by supplying the exact order ID (`id = auth.uid()` or matching exact order ID query parameter via RPC/restricted policy). Currently, `USING (true)` allows an attacker to query `SELECT * FROM orders` and read all customer names, phone numbers, and dining history.
2. **Uncancelled Stock Leak on Waiter / Billing Rejection**
   - **Files:** `src/features/ordering/actions/waiterActions.ts` (`cancelOrder`)
   - **What happens:** Rejecting or cancelling an order marks `orders.status = 'cancelled'`, but the stock for all ordered items remains deducted.
   - **What should happen:** Cancelling an order must restore `stock_qty += qty` for each `menu_item` in `order_items`.
3. **Table Occupancy Check Race Condition**
   - **File:** `src/features/ordering/actions/waiterActions.ts` (`getOrCreateTableAndCheckOccupied`)
   - **What happens:** Checks if table is occupied via a `SELECT` query, then proceeds to create table or allow guest entry. Two customers scanning the QR code at the exact same second can both pass the check simultaneously.
   - **What should happen:** Use a DB transaction or unique constraint on active dining table sessions.

---

## 6. Security Issues
1. **Critical RLS Read Leak on Orders, Order Items, and Tables**
   - **Tables:** `public.orders`, `public.order_items`, `public.restaurant_tables`
   - **Details:** `024_fix_public_rls_policies.sql` uses `USING (true)` for public SELECT access. Any anonymous HTTP request using Supabase Anon Key can fetch all orders and guest PII (phone numbers, full names, total spends).
2. **Missing Input Sanitation on Table Creation in Server Action**
   - **File:** `src/features/ordering/actions/waiterActions.ts` (`getOrCreateTableAndCheckOccupied`)
   - **Details:** If table is missing, `adminEdge.from('restaurant_tables').insert({ table_no })` creates new tables on-the-fly without checking if `table_no` is within valid restaurant table ranges (e.g., negative numbers or table #99999).

---

## 7. What Needs Improvement (Prioritized)
1. **Fix Compiler Errors (`npx tsc --noEmit`) [URGENT]**
   - *Why:* Ensures clean CI/CD production builds.
   - *Effort:* Small (Fix remaining 10 type errors in `AdminStaff.tsx`, `AdminTables.tsx`, `AdminTablesLive.tsx`, `BillingDash.tsx`, `OrderHistory.tsx`).
2. **Fix RLS Policy Data Leak on `orders` and `order_items` [URGENT]**
   - *Why:* Protects customer PII and prevents competitor/hacker scraping of restaurant order data.
   - *Effort:* Small (Update RLS policy in migration to restrict SELECT queries).
3. **Add `idempotency_key` Migration & Stock Restoration Triggers [HIGH]**
   - *Why:* Ensures clean DB resets and accurate physical inventory tracking.
   - *Effort:* Medium (Create SQL migration for `idempotency_key` and `AFTER UPDATE/DELETE` stock refund trigger).
4. **Clean Up Orphaned Orders on Stock Failures [MEDIUM]**
   - *Why:* Keeps database clean when items sell out mid-checkout.
   - *Effort:* Small (Add `try/catch` cleanup in `submitOrder.ts`).
