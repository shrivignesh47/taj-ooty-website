# Billing System Comparison: Hotel Taj Ooty POS vs. Commercial POS (Petpooja / Toast / Square)

---

## 1. Feature Comparison Table

| Feature Area | Petpooja / Toast POS / Square | Our System (Taj Ooty POS) | System Status | Technical Notes |
|---|---|---|---|---|
| **Table & Floor Map Grid** | Interactive grid, merge tables, move items between tables | Interactive floor grid, color status, live bill totals | ✅ Working | Integrated via `AdminTablesLive.tsx` & `BentoDashboard.tsx` |
| **Takeaway & Counter Orders** | Direct counter queue, instant bill/KOT dispatch | Quick takeaway drawer creator + separate counter queue | ✅ Working | Managed via `BillingTakeawayCreator.tsx` & `BillingTakeaway.tsx` |
| **Online Aggregators (Swiggy/Zomato)** | Real-time webhook integration, auto menu sync | Simulation mode with manual toggle & acceptance queue | ⚠️ Partial | `simulateOnlineOrder` creates mock orders; no live partner API webhooks |
| **KOT & Station Routing** | Multi-kitchen printer routing (Tandoor, Bar, Kitchen) | Real-time KOT monitor, station routing, status updates | ✅ Working | Station category mapping & live item status tracking in place |
| **Stock & Inventory Tracking** | Recipe-level auto-deduction, low stock alerts | Menu item stock toggle (available/86ed) | ⚠️ Partial | Manual stock availability toggling; no automatic recipe-based deduction |
| **Staff Attendance & Shift Logs** | Biometric / PIN clock-in, shift hours calculation | Clock In / Clock Out dropdown modal & log archive | ✅ Working | Persisted to `staff_attendance` table |
| **Cash Register & Drawer Sessions** | Opening float, expected cash vs count, discrepancy tracking | Session open/close with expected vs actual cash | ✅ Working | Managed via `cash_register_sessions` table and Server Actions |
| **Petty Cash Expenses** | Expense logging per shift, category tagging, cash drawer deduction | Expense logger with amount, category, and cashier audit | ✅ Working | Managed via `petty_expenses` table |
| **Bill Generation & Tax Calculations** | Configurable CGST, SGST, Service Charge, inclusive/exclusive tax | CGST, SGST, Service Charge, Inclusive/Exclusive tax logic | ✅ Working | Handled by `getCheckoutCalculation` reading `restaurant_settings` |
| **Payment Settlement & Tender** | Multi-tender split payments (e.g. ₹500 Cash + ₹500 UPI on 1 bill) | Single tender recording per settled bill ('cash', 'card', 'upi') | ⚠️ Partial | UI offers split bill per person (guest count), but single payment method per bill |
| **Reports & Sales Analytics** | Z-reports, hourly sales, category breakdown, tax summary | Sales Summary, Category sales, Item popularity breakdown | ✅ Working | Rendered in `BillingReports.tsx` |
| **Guest / Customer CRM** | Guest phone lookups, loyalty points, past visit history | Customer phone & name tracking per order | ⚠️ Partial | Orders store guest details; no centralized loyalty system |
| **Staff Roles & Permissions** | Fixed tiers (Manager, Cashier, Waiter) | Highly granular permission keys (19 DB-enforced permissions) | ✅ Superior | Role permissions configurable down to individual feature toggles |
| **Data Export** | Export revenue, tax, and inventory logs to Excel / CSV | Export bill archive and sales reports to Excel (`xlsx`) | ✅ Working | Managed via `xlsx` library in `BillingReports.tsx` |
| **Dashboard Personalization** | Static dashboard per role | Drag/toggle customizable Bento widget catalog per staff role | ✅ Superior | `CustomizeDashboardDrawer.tsx` persists to `dashboard_preferences` |
| **Coupons & Discounts** | Dynamic promo engine, coupon codes, percentage/amount rules | Preset coupons (`TAJ10`, `FESTIVE15`) + custom discount | ✅ Working | Custom discount & coupon validation in `useBillingState.ts` |

---

## 2. Logic Flow Comparison

### A. Order Lifecycle & KOT Flow
- **Industry Standard**: Pending Order → Sent to KOT → Kitchen Preparing → Station Ready → Served to Table → Billed & Settled.
- **Our Implementation**:
  - `pending` / `confirmed` → `preparing` → `ready` → `served` → `billed`.
  - Item-level readiness tracked via `order_item_status` table (`pending` | `preparing` | `ready`).
  - **Verdict**: Fully aligned with standard KOT workflows.

### B. Bill Calculation (Order of Operations)
- **Industry Standard (Indian GST POS)**:
  1. Item Subtotal = $\sum (\text{Price} \times \text{Qty})$
  2. Taxable Amount = Subtotal - Discount
  3. Service Charge = Taxable Amount $\times$ Service Charge %
  4. GST (5%) = (Taxable Amount + Service Charge) $\times$ 5%
  5. Grand Total = Taxable Amount + Service Charge + GST
- **Our Implementation (`getCheckoutCalculation` in `useBillingState.ts`)**:
  - Service Charge is calculated on **Subtotal** (`subtotal * serviceChargeRate`), before discount.
  - CGST + SGST are calculated on **Taxable Amount** (`taxableAmount * splitRate`), ignoring the Service Charge.
  - **Deviation**: GST should legally apply to the Service Charge component under Indian GST laws.

### C. Payment Settlement
- **Industry Standard**: Supports multi-tender payment splitting on a single invoice (e.g., Guest pays ₹600 via UPI and ₹400 via Cash).
- **Our Implementation**:
  - `settleBillWithPayment` accepts a single `paymentMethod: 'cash' | 'card' | 'upi'`.
  - `isSplitEnabled` in UI divides the grand total equally by number of guests (`splitGuests`), but settles the entire table under a single payment method.
  - **Deviation**: Lacks multi-tender split payment database records.

### D. Online Aggregator Integration (Swiggy / Zomato)
- **Industry Standard**: Webhook integration via UrbanPiper or direct Swiggy/Zomato APIs to push menu, receive orders automatically, and sync order status back to aggregators.
- **Our Implementation**:
  - UI includes `AggregatorGatesCard.tsx` and `BillingOnlineOrders.tsx`.
  - Orders are generated via `simulateOnlineOrder('swiggy' | 'zomato')` for manual testing.
  - **Deviation**: Simulation-only; requires live webhook middleware for production aggregator integration.

### E. Cash Register Reconciliation (Z-Reports)
- **Industry Standard**: Shift opening cash float $\rightarrow$ System tracks cash payments and petty cash expenses $\rightarrow$ Cashier enters closing cash count $\rightarrow$ System generates Variance Report (Over/Short).
- **Our Implementation**:
  - `openRegisterSession` logs opening float.
  - Cash sales and petty cash expenses update `expectedCash`.
  - `closeRegisterSession` logs actual cash entered by cashier and saves discrepancy to `cash_register_sessions`.
  - **Verdict**: Matches industry-standard cash register audit workflows.

---

## 3. Bugs & Inconsistencies Found

1. **Service Charge Tax Scope**: `getCheckoutCalculation` computes GST only on `taxableAmount` and excludes `service` charge from GST base.
2. **Preset Coupons Hardcoding**: `PRESET_COUPONS` is hardcoded in `useBillingState.ts` and `BillingCheckout.tsx` rather than stored in a `coupons` DB table.
3. **Multi-Tender Missing**: Split payment UI cannot assign different payment methods (e.g. half cash, half UPI) to a single bill.
4. **TypeScript `any` Usage**: Over 40 instances of `any` types remain in `useBillingState.ts`, `BentoDashboard.tsx`, `BillingCheckout.tsx`, `BillingTakeawayCreator.tsx`, `BillingTakeaway.tsx`, `BillingReports.tsx`, and `BillingDash.tsx`.
5. **Aggregator Webhooks**: Swiggy & Zomato order injection is currently powered by `simulateOnlineOrder` server action rather than real Webhook REST endpoints.

---

## 4. What's Genuinely Better in Our System

1. **Deep Granular Role Security**: 19 discrete permission keys in Postgres DB mapped per role, allowing exact feature-level access control superior to fixed role tiers in Petpooja or Toast.
2. **Personalized Bento Box Dashboard**: Each staff member can toggle and reorder widgets (`floor_map`, `takeaway_desk`, `kot_monitor`, `stock_availability`, `staff_attendance`, `trending_dish`, `cash_register`), saved automatically to `dashboard_preferences`.
3. **Zero License / Subscription Fee**: Fully open-source and self-hostable with Supabase backend.
4. **Sleek Executive POS UI**: Compact, high-density touch layout optimized for fast table service without bloated vertical spacing.

---

## 5. Priority Improvement List

| Rank | Improvement | Why It Matters | Effort | Target Files |
|---|---|---|---|---|
| 1 | **Multi-Tender Payment Settlement** | Essential for customers splitting bills across Cash + UPI / Card | Medium | `billingActions.ts`, `useBillingState.ts`, `BillingCheckout.tsx` |
| 2 | **GST on Service Charge Correction** | Ensures strict compliance with Indian GST taxation laws | Small | `useBillingState.ts` (`getCheckoutCalculation`) |
| 3 | **Database-Driven Coupons & Offers** | Allows management to create and edit promo codes without code edits | Medium | `supabase/migrations/`, `useBillingState.ts` |
| 4 | **Refactor TypeScript `any` Types** | Guarantees strict type safety across all POS hooks and components | Medium | `useBillingState.ts`, `BentoDashboard.tsx`, `BillingCheckout.tsx` |
| 5 | **Aggregator Webhook Integration Endpoint** | Enables real production order reception from Swiggy & Zomato | Large | `src/app/api/webhooks/aggregators/route.ts` |

---

## 6. Recommended Next Features

1. **Multi-Tender Split Payments**: Allow cashiers to record split amounts per payment method on a single invoice (e.g., ₹300 Cash + ₹700 UPI).
2. **Thermal Receipt Printing Engine**: Add direct ESC/POS web receipt printing support for 80mm & 58mm thermal printers.
3. **Dynamic Coupon Management**: Build an Admin UI screen to create, update, and deactivate discount coupons in the database.
4. **Customer Loyalty & CRM History**: Track repeat guests by phone number with past order history, total spend, and loyalty points.
5. **Recipe & Ingredients Inventory (BOM)**: Automatically deduct raw inventory (rice, oil, poultry) whenever a menu item is billed.
