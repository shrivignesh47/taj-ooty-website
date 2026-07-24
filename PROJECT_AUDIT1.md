# Project Audit - Taj Ooty Restaurant POS (Post-Fix)

**Date of Audit:** July 2026

## 1. Production Readiness Verdict
**Verdict: Yes, ready for a soft-launch (but not yet for fully unattended/high-volume use).**

**Top 3 Reasons:**
1. **Security Holes Plugged:** The critical RLS data leaks on public-facing tables are closed, and unauthenticated users can no longer scrape order data or table metrics.
2. **API Safety:** The customer order submission flow has been stripped of its Service Role bypass. It now enforces strict server-side validation (name, phone, table constraints, item validity) and relies on the anonymous client, preventing DoS attacks and garbage data injection.
3. **Financial Accuracy:** The hardcoded service charge bug is resolved. The checkout calculation now accurately honors the GST configuration settings and applies the service charge to both inclusive and exclusive GST branches.

## 2. Pros — What's Genuinely Solid
- **Realtime Stability:** The Supabase realtime channels are now optimized with stable `useRef` callbacks, eliminating the excessive server-action polling that previously spammed the database.
- **Cash Management:** Register sessions and petty expenses are durable, backed by proper SQL tables rather than volatile React state, providing a reliable audit trail.
- **Stock Ordering Integrity:** The database uses a `BEFORE INSERT` trigger to atomically decrement stock, preventing the most common concurrency bugs when multiple users order the last remaining item.

## 3. Cons — What's Weak or Risky
- **Inventory Refund Leaks:** Stock management is still a one-way street. If a waiter voids a KOT, cancels an order, or removes an item, the digital stock is never restored. Physical inventory will slowly drift out of sync with the system.
- **Missing Stock Constraints:** While the trigger prevents over-ordering, the `menu_items` table lacks a strict database-level `CHECK (stock_qty >= 0)` constraint as a final safeguard against negative inventory.

## 4. Bugs Found
1. **Symptom:** Stock goes negative or drifts from reality over time.
   - **File:** `supabase/migrations/023_payment_method_register_stock.sql` (Trigger Definition)
   - **Why:** There is no `AFTER UPDATE` or `AFTER DELETE` trigger on `order_items` to refund stock when items are removed or when an entire order transitions to `status = 'cancelled'`.
2. **Symptom:** Staff can bypass negative stock in Edge Cases.
   - **File:** Database Schema (`menu_items`)
   - **Why:** The `stock_qty` column lacks a `CHECK (stock_qty >= 0)` constraint, meaning direct admin SQL updates or unhandled race conditions could theoretically push stock negative.

## 5. Logical Errors
1. **Missing Stock Restoration on Cancellation:** 
   - *Expected:* When an order status is updated to `cancelled`, the quantities of its associated `order_items` should be added back to `menu_items.stock_qty`.
   - *Actual:* Cancellation simply changes a string enum on the `orders` table. The inventory is permanently lost.

## 6. Security Issues
- The major vulnerabilities (RLS data leaks and Service Role bypasses) have been successfully neutralized. 
- *Note:* The system relies on `su.auth_id = auth.uid()` for internal permission checks, which is secure but tightly couples the POS roles to Supabase Auth. This is acceptable for current scale but may require refactoring if migrating to a different identity provider.

## 7. What Needs Improvement (Prioritized)
1. **Fix Inventory Leaks (Medium Priority, Medium Effort):** Add an `AFTER UPDATE OR DELETE` database trigger on `order_items` and `orders` to refund `menu_items.stock_qty` when an item is removed or an order is cancelled.
2. **Add Strict DB Constraints (Medium Priority, Small Effort):** Run a quick migration to add `CHECK (stock_qty >= 0)` to the `menu_items` table.
3. **Session Replay / Idempotency (Low Priority, Large Effort):** Implement idempotency keys for the `submitCustomerOrder` endpoint so that if a customer has a spotty network connection and hits "Submit" twice, it doesn't accidentally charge them / create two identical orders.
