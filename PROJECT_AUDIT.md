# Project Audit - Taj Ooty Restaurant POS

**Date of Audit:** July 2026

## 1. Production Readiness Verdict
**Verdict: Not yet safe for real paying customers.**

**Top 3 Reasons:**
1. **Critical Data Leak:** The Row Level Security (RLS) policies on `orders` and `order_items` (e.g., `"public can view own order by id"`) use `USING (true)`. This means any unauthenticated user scanning a QR code can query the database to read **all** orders from all tables, exposing customer names, phone numbers, and spending habits.
2. **Service Role Bypass for Customers:** The `submitCustomerOrder` server action uses `supabaseAdmin` (the Service Role key) to insert orders, order items, and even automatically create new tables. Because it bypasses RLS, an attacker can spam this endpoint with fabricated payloads to perform a Denial of Service (DoS) attack, inject fake orders, or create thousands of phantom tables.
3. **Financial Calculation Error:** During bill settlement, the `getCheckoutCalculation` function hardcodes the service charge to `0`, completely ignoring the global `chargeServiceTax` setting. You will lose revenue because service charges are never applied to final bills.

## 2. Pros — What's Genuinely Solid
- **Atomic Stock Decrement:** Stock reduction is handled correctly at the database level via a `BEFORE INSERT` trigger (`trg_check_stock_on_order_item`), preventing race conditions when multiple customers order the same limited item simultaneously.
- **Cash Register & Petty Expenses:** These are built robustly using real persistent database tables (`cash_register_sessions`, `petty_expenses`), ensuring no data loss on refresh, and accurately tying opening floats and expenses to a specific cashier's shift.
- **UI Architecture:** The Next.js App Router structure and Tailwind UI are highly responsive and maintain good state separation.

## 3. Cons — What's Weak or Risky
- **Overuse of `supabaseAdmin`:** Server actions rely heavily on the Service Role key rather than scoped RLS. While safe for internal admin tools, using it for public-facing customer actions (like placing an order) is highly risky.
- **Inventory Leaks:** Stock management is a one-way street. Items are decremented when ordered, but there is no mechanism (trigger or code) to restore stock if an order is cancelled or an item is deleted.
- **Permissive Read Policies:** `restaurant_tables`, `orders`, and `order_items` are globally readable by the `public` role.

## 4. Bugs Found
1. **Symptom:** Service charge is missing from the final bill.
   - **File:** `src/app/staff/billing/hooks/useBillingState.ts`
   - **Why:** In `getCheckoutCalculation()`, the variable `service = 0;` is hardcoded for both inclusive and exclusive GST calculations, overriding the active settings.
2. **Symptom:** Unauthenticated users can read all table numbers and all active orders.
   - **File:** `supabase/migrations/007_rls_permission_based.sql`
   - **Why:** The policies `"public can view own order by id"`, `"public can view order items"`, and `"public can view tables"` all incorrectly use `FOR SELECT USING (true)`, granting global read access.
3. **Symptom:** Customers can create infinite or negative table numbers.
   - **File:** `src/features/ordering/actions/submitOrder.ts`
   - **Why:** If a table doesn't exist, the `supabaseAdmin` client blindly inserts a new one based on the customer's payload without validating if the table number is physically possible or bounded by the restaurant.

## 5. Logical Errors
1. **Inventory Leak on Cancellation:** 
   - *Expected:* When an order is marked as `cancelled` or an item is deleted, `menu_items.stock_qty` should increment back.
   - *Actual:* There is only a `BEFORE INSERT` trigger to decrement. Stock is permanently lost when orders are voided.
2. **Admin-Level Execution for Customer Actions:**
   - *Expected:* Customers inserting an order should be bound by RLS policies checking their session or table ownership.
   - *Actual:* The action runs via `supabaseAdmin`, making all public INSERT RLS policies completely irrelevant.

## 6. Security Issues
- **RLS Gaps:** `orders`, `order_items`, and `restaurant_tables` have `USING (true)` for public `SELECT`.
- **Service Role Usage:** `submitCustomerOrder` directly accepts unsanitized `cart` and `customer` objects and pushes them into the database using `supabaseAdmin`, bypassing all database-level security checks.

## 7. What Needs Improvement (Prioritized)
1. **Lock Down Customer Order Insertion (High Priority, Medium Effort):** 
   - Remove `supabaseAdmin` from `submitCustomerOrder`. Use an anonymous client and enforce strict RLS INSERT policies, or strictly validate the payload server-side before using the admin client.
2. **Patch RLS Data Leaks (High Priority, Small Effort):**
   - Update `SELECT` policies for `orders` and `order_items` to restrict public reads to only the specific `table_id` associated with the active customer session.
3. **Fix Financial Calculations (High Priority, Small Effort):**
   - Update `getCheckoutCalculation` in `useBillingState.ts` to actually apply `settings.serviceChargeRate` to the `service` variable before finalizing the grand total.
4. **Implement Stock Restoration (Medium Priority, Small Effort):**
   - Add an `AFTER UPDATE OR DELETE` database trigger on `order_items` to refund `menu_items.stock_qty` when an item is removed or an order status becomes `cancelled`.
