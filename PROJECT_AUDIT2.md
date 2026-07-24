# Project Audit - Taj Ooty Restaurant POS (Current State)

**Date of Audit:** July 2026

## 1. Production Readiness Verdict
**Verdict: Yes, safe for a soft launch (but not yet ready for fully unattended, high-volume operations).**

**Top 3 Reasons:**
1. **Security & Financial Integrity Restored:** The critical RLS data leaks and the `submitCustomerOrder` service-role bypass have been patched. The system is no longer vulnerable to unauthenticated data scraping or table-creation DoS attacks. Additionally, the service charge billing bug has been resolved.
2. **Robust Realtime Architecture:** The Next.js frontend properly leverages Supabase channels and React `useRef` to maintain real-time syncing of orders and tables across the Waiter, Kitchen, and Cashier dashboards without spamming server actions or overwhelming the database.
3. **Lingering Inventory Gaps:** While safe for customers and billing, the back-office inventory logic remains incomplete. Cancelled orders do not restore stock to the database, which will require managers to manually audit and reset stock levels until a restoration mechanism is built.

## 2. Pros — What's Genuinely Solid
- **Atomic Stock Deduction:** A PostgreSQL `BEFORE INSERT` trigger correctly handles concurrency when multiple customers attempt to order the same limited-availability item.
- **Cash Register Durability:** Petty expenses and register sessions are backed by real SQL tables (rather than volatile React state), ensuring accurate shift tracking and expected-cash reconciliation.
- **Role-Based Access Control:** The `has_permission()` database function securely links Supabase Auth `uid()` to the `staff_users` table, ensuring that RLS policies natively enforce granular permissions (e.g., only staff with `manage_menu` can alter items).

## 3. Cons — What's Weak or Risky
- **Idempotency Missing:** The customer ordering flow relies on client-side state. If a customer has a spotty network connection and repeatedly mashes the "Submit" button, the system lacks idempotency keys to prevent duplicate order generation.
- **Stock Restoration:** Inventory deduction is a one-way street. Voiding a KOT or cancelling an order simply updates a string status, permanently leaking the digital stock.
- **Constraint Gaps:** While triggers prevent over-ordering during standard operations, the database schema lacks hard table constraints (e.g., `CHECK (stock_qty >= 0)`) to guard against direct admin edits or unforeseen edge cases.

## 4. Bugs Found
1. **Symptom:** Stock quantities can theoretically be forced negative via direct admin SQL updates.
   - **File:** Database Schema (`menu_items`)
   - **Why:** The table expects quantities to remain positive, but there is no structural `CHECK (stock_qty >= 0)` constraint enforced at the database level.

## 5. Logical Errors
1. **Inventory Leak on Void/Cancel:**
   - *Expected:* When an order transitions to `status = 'cancelled'` or an item is deleted from an active ticket, the system should refund the physical quantity back to `menu_items.stock_qty`.
   - *Actual:* No such logic exists. The `trg_check_stock_on_order_item` trigger only fires on `INSERT`. Stock is permanently lost.

## 6. Security Issues
- **RLS is secure:** The `USING (true)` policies for public reads on `orders` and `restaurant_tables` have been successfully replaced with strict, localized access.
- **Admin Keys Isolated:** `supabaseAdmin` (Service Role) is no longer dangerously exposed in customer-facing insert operations.

## 7. What Needs Improvement (Prioritized)
1. **Implement Stock Refund Triggers (High Priority, Medium Effort):** Create `AFTER UPDATE` and `AFTER DELETE` PostgreSQL triggers on `order_items` and `orders` to automatically refund `menu_items.stock_qty` when a ticket is cancelled or voided.
2. **Enforce Database Integrity Constraints (Medium Priority, Small Effort):** Add strict table-level constraints like `CHECK (stock_qty >= 0)` to prevent any possibility of negative inventory.
3. **Add Submission Idempotency (Low Priority, Large Effort):** Introduce an `idempotency_key` column to the `orders` table and pass a unique UUID from the client on submission to safely reject accidental duplicate network requests.
