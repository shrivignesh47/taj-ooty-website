# Project Audit - Taj Ooty Restaurant POS (Final Diagnostics)

**Date of Audit:** July 2026

## 1. Production Readiness Verdict
**Verdict: Safe for soft launch, nearly ready for high-volume operations.**

**Top 3 Reasons:**
1. **Database Bulletproofed:** Our recent diagnostic checks confirmed that the PostgreSQL database has been fully fortified. The critical stock-restoration triggers (`trg_refund_stock_on_cancel`, `trg_refund_stock_on_item_delete`) and the `stock_qty_non_negative` constraint are already successfully applied at the database level.
2. **Security & Financial Intact:** RLS leaks are patched, the `submitCustomerOrder` service-role bypass is closed, and the checkout math correctly computes service charges.
3. **Application Wiring Mismatch:** While the database now correctly holds an `idempotency_key` column for `orders`, the Next.js codebase (specifically `submitOrder.ts`) completely ignores it. Furthermore, the codebase currently suffers from over 200 TypeScript `any` violations. 

## 2. Pros — What's Genuinely Solid
- **Full Inventory Lifecycle:** With the database triggers in place, stock is not only atomically decremented on order placement, but physically refunded if a waiter cancels an order or voids an item. 
- **Check Constraints:** The database physically prevents `stock_qty` from ever dropping below zero, providing an ultimate safeguard against race conditions.
- **Durable Sessions:** Cash register sessions and petty expenses are firmly anchored to the database and tied to specific staff auth sessions.

## 3. Cons — What's Weak or Risky
- **Ignored Idempotency:** The database is ready for idempotency keys, but the client doesn't send them. A customer mashing the "Place Order" button on a slow 3G connection can still generate duplicate KOTs and double-charge themselves.
- **TypeScript Tech Debt:** There are 217 `eslint` errors specifically for `@typescript-eslint/no-explicit-any`. The team is actively circumventing type safety in the critical dashboard components (`WaiterDash.tsx`, `ActiveOrders.tsx`, etc.), making future refactors highly brittle.

## 4. Bugs Found
1. **Symptom:** Idempotency column is dead code.
   - **File:** `src/features/ordering/actions/submitOrder.ts`
   - **Why:** The codebase expects to just insert a new order without passing an idempotency key. A network retry will result in a fresh `INSERT`.
2. **Symptom:** `eslint` fails the CI build.
   - **File:** Various (e.g., `WaiterDash.tsx`, `IncomingOrders.tsx`)
   - **Why:** Massive overuse of `any` types for Supabase payload mappings.

## 5. Logical Errors
- There are no major operational business-logic errors remaining. The stock leaks and billing miscalculations have been resolved at the database and application levels, respectively.

## 6. Security Issues
- RLS read policies are tightly scoped. 
- Admin keys are walled off. 
- No glaring API vulnerabilities remain.

## 7. What Needs Improvement (Prioritized)
1. **Wire up Idempotency (High Priority, Small Effort):** Update the frontend cart submission logic to generate a UUID `idempotency_key` and pass it to `submitCustomerOrder` to prevent duplicate billing.
2. **Eradicate `any` Types (Medium Priority, Large Effort):** Create strict TypeScript interfaces for `Order` and `OrderItem` and aggressively replace the 217 `any` casts in the staff dashboards to ensure UI stability.
