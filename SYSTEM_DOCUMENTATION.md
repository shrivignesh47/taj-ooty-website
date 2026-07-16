# Hotel Taj Ooty — Restaurant POS System Documentation

> **As-built as of July 2026.** Written from actual codebase inspection, not from plans.
> Intended for feature comparison against third-party POS systems (e.g. Petpooja).

---

## 1. System Overview

### What This Is

A multi-role, web-based restaurant POS and ordering system built for Hotel Taj Ooty. It covers the full cycle from customer self-ordering (QR scan) → waiter queue management → kitchen display → cashier billing.

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript strict mode) |
| Styling | Tailwind CSS v4 |
| Database | Supabase (PostgreSQL + Auth + Realtime + Storage) |
| State (client) | Zustand (`useCartStore`) for customer cart |
| Print | Browser `window.open()` print popups — no native printer SDK |
| Excel Export | `xlsx` (SheetJS) library |
| Animations | Framer Motion |

### Architecture Summary

```
/app
  /MenuCard          → Customer self-ordering (QR scan)
  /menu              → Redirect/alias for MenuCard
  /staff
    /login           → Staff login form
    /kitchen         → Kitchen Display System (KDS)
    /orders          → Waiter dashboard
    /billing         → Cashier POS
    /admin           → Admin panel
    /dashboard       → Role-based redirect dispatcher
```

All staff routes are server-rendered pages that verify the session server-side via `verifyStaff()` before rendering the client component. There is no separate API layer — mutations use Next.js Server Actions.

### Database: Local vs Cloud

The system was originally developed against Supabase Cloud (project `shgarlpvtvifcjlqlqtw.supabase.co`), but is currently configured to run against a **local Supabase instance** (`http://localhost:54321`).

Both connection keys are in `.env.local`. Cloud keys are commented out. Realtime, Auth, and DB all run locally via `supabase start`.

The database is **not currently deployed to Vercel**. The app runs locally on `http://localhost:3000`.

---

## 2. Database Schema

### Tables (in creation order)

#### `bills`
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK, DEFAULT gen_random_uuid() |
| order_id | uuid | FK → orders.id (implied, no enforced FK in base schema) |
| total | numeric(10,2) | NOT NULL |
| cashier_id | uuid | nullable |
| paid_at | timestamptz | nullable |

#### `categories`
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| name | text | NOT NULL |
| sort_order | integer | NOT NULL, DEFAULT 0 |

**Seeded categories (12):** Soup, Sandwiches, Starters, Shawarma, Tandoori, Briyani, Rice & Noodles, Sea Food, Drinks, Ice Cream, Milk Shake, Dessert

#### `menu_items`
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| category_id | uuid | FK → categories.id (migration 013) |
| name | text | NOT NULL |
| price | numeric(10,2) | NOT NULL |
| image_url | text | nullable |
| is_available | boolean | NOT NULL, DEFAULT true |
| is_veg | boolean | NOT NULL, DEFAULT false (added migration 004) |
| stock_qty | integer | nullable (added migration 022); NULL = unlimited |

**Menu size:** ~175 items across all categories from seed.sql.

#### `order_items`
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| order_id | uuid | FK → orders.id (migration 017) |
| menu_item_id | uuid | FK → menu_items.id (migration 017) |
| qty | integer | NOT NULL, CHECK (qty > 0) |
| notes | text | nullable |
| price_at_order | numeric(10,2) | NOT NULL |
| status | text | nullable; used values: 'pending', 'ready', 'cancelled' |

#### `orders`
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| table_id | uuid | FK → restaurant_tables.id (migration 016) |
| customer_name | text | NOT NULL |
| customer_phone | text | NOT NULL |
| status | text | NOT NULL, DEFAULT 'pending'; CHECK (status IN ('pending','confirmed','preparing','ready','served','billed','cancelled','on_hold')) |
| waiter_id | uuid | nullable |
| created_at | timestamptz | NOT NULL, DEFAULT now() |
| token_no | text | nullable (added migration 015) |
| source | text | nullable (added migration 014); values: 'dine_in', 'takeaway', 'swiggy', 'zomato' |

#### `order_status_history`
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| order_id | uuid | FK → orders.id (migration 018) |
| status | text | NOT NULL |
| changed_by | uuid | nullable (references staff_users.id) |
| changed_at | timestamptz | NOT NULL, DEFAULT now() |

#### `order_item_status`
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| order_item_id | uuid | FK → order_items.id ON DELETE CASCADE |
| is_done | boolean | NOT NULL, DEFAULT false |
| marked_by | uuid | FK → staff_users.id |
| marked_at | timestamptz | DEFAULT now() |
| (unique) | | UNIQUE(order_item_id) |

Used by KDS for per-item done-marking within a ticket.

#### `restaurant_tables`
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| table_no | integer | NOT NULL |
| qr_code_url | text | nullable |
| assigned_waiter_id | uuid | nullable |

**Seeded:** 25 tables (table_no 1–25). QR URLs are `http://localhost:3000/MenuCard?table={id}`.

#### `permissions`
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| key | text | NOT NULL |

**All permission keys in system (15):**
`view_orders`, `edit_orders`, `confirm_orders`, `view_kitchen_queue`, `update_prep_status`, `view_billing`, `generate_bills`, `edit_menu`, `view_menu`, `manage_staff`, `manage_roles`, `view_revenue`, `export_data`, `manage_tables`, `manage_gst`

> **Note:** `manage_cash_drawer`, `manage_expenses`, `manage_inventory` are referenced in UI code but do **not** exist in the permissions table. Those checks always return false (permission denied).

#### `roles`
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| name | text | NOT NULL |
| is_custom | boolean | NOT NULL, DEFAULT false |
| created_at | timestamptz | NOT NULL, DEFAULT now() |

#### `role_permissions`
| Column | Type | Constraints |
|---|---|---|
| role_id | uuid | PK part, FK → roles.id (migration 012) |
| permission_id | uuid | PK part, FK → permissions.id (migration 012) |

#### `staff_users`
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| auth_id | uuid | UNIQUE, FK → auth.users.id |
| name | text | NOT NULL |
| phone | text | nullable |
| role_id | uuid | FK → roles.id (migration 011) |
| is_active | boolean | NOT NULL, DEFAULT true |
| created_at | timestamptz | NOT NULL, DEFAULT now() |

#### `staff_activity_log`
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| staff_id | uuid | FK → staff_users.id ON DELETE SET NULL |
| action | text | NOT NULL |
| details | jsonb | nullable |
| created_at | timestamptz | NOT NULL, DEFAULT now() |

Actions logged: `ORDER_CONFIRMED`, `ORDER_PREPARING`, `ORDER_READY`, `ORDER_SERVED`, `ORDER_BILLED`, etc.

#### `staff_attendance`
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| staff_id | uuid | FK → staff_users.id ON DELETE CASCADE |
| clock_in | timestamptz | NOT NULL, DEFAULT now() |
| clock_out | timestamptz | nullable |
| status | text | NOT NULL, DEFAULT 'active' |
| created_at | timestamptz | NOT NULL, DEFAULT now() |

#### `restaurant_settings` (single row)
| Column | Type | Default |
|---|---|---|
| id | uuid | PK |
| restaurant_name | text | 'Hotel Taj Ooty' |
| gst_number | text | nullable |
| fssai_number | text | nullable |
| address | text | nullable |
| phone | text | nullable |
| email | text | nullable |
| website | text | nullable |
| service_charge_percent | numeric(5,2) | 0 |
| updated_at | timestamptz | now() |
| auto_print_on_accept | boolean | false |
| printer_name | text | nullable |
| print_kot | boolean | true |
| print_bill | boolean | true |
| kds_config | jsonb | nullable (KDSSettings JSON) |
| station_routing_enabled | boolean | false |
| legal_business_name | text | 'Hotel Taj Ooty' |
| trade_name | text | 'Hotel Taj' |
| gstin | text | '' |
| tax_scheme | text | 'Regular Scheme (5% GST No ITC)' |
| registration_state | text | 'Tamil Nadu' |
| default_hsn_code | text | '996331' |
| enable_ecommerce_tax | boolean | false |
| pricing_strategy | text | 'exclusive' |
| print_gstin_bill | boolean | true |
| print_cgst_sgst_split | boolean | true |
| print_hsn_items | boolean | true |
| print_customer_gstin | boolean | true |
| aggregator_mappings | jsonb | Swiggy/Zomato/Direct Delivery defaults |

#### `kitchen_stations`
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| name | text | NOT NULL UNIQUE |
| color | text | NOT NULL, DEFAULT '#C9974A' |
| is_active | boolean | NOT NULL, DEFAULT true |
| sort_order | int | NOT NULL, DEFAULT 0 |
| created_at | timestamptz | NOT NULL, DEFAULT now() |

**Seeded stations (7):** Tandoor & Grill, Curries & Gravy, Biriyani & Mandi, Starters, Breads & Naan, Beverages, Desserts

#### `station_category_map`
| Column | Type | Constraints |
|---|---|---|
| station_id | uuid | PK part, FK → kitchen_stations.id ON DELETE CASCADE |
| category_id | uuid | PK part, FK → categories.id ON DELETE CASCADE |

---

### Realtime Publications

Tables in `supabase_realtime` publication (live WebSocket push enabled):
- `orders`
- `order_items`
- `restaurant_tables`

**Not** in realtime publication (polled or fetched on demand):
- `menu_items`, `order_status_history`, `kitchen_stations`, `staff_activity_log`

---

### RLS Policies (Final State After All 22 Migrations)

#### `orders`
| Policy | Operation | Condition |
|---|---|---|
| public can create orders | INSERT | `WITH CHECK (true)` |
| public can view own order by id | SELECT | `USING (true)` |
| staff can update orders | UPDATE | `has_permission('edit_orders') OR has_permission('confirm_orders') OR has_permission('update_prep_status')` |

#### `order_items`
| Policy | Operation | Condition |
|---|---|---|
| public can add order items on creation | INSERT | `WITH CHECK (true)` |
| public can view order items | SELECT | `USING (true)` |
| staff can manage order items | ALL | `has_permission('edit_orders') OR has_permission('confirm_orders') OR has_permission('update_prep_status') OR has_permission('manage_orders')` |

#### `bills`
| Policy | Operation | Condition |
|---|---|---|
| staff can view bills | SELECT | `has_permission('view_billing') OR has_permission('generate_bills') OR has_permission('view_revenue') OR has_permission('manage_staff')` |
| staff can manage bills | ALL | `has_permission('generate_bills') OR has_permission('view_billing') OR has_permission('manage_staff')` |

#### `restaurant_tables`
| Policy | Operation | Condition |
|---|---|---|
| public can view tables | SELECT | `USING (true)` |
| all staff can view tables | SELECT | `TO authenticated USING (true)` |
| staff with manage_tables can modify tables | ALL | `has_permission('manage_tables') OR has_permission('manage_staff')` |

#### `menu_items`
| Policy | Operation | Condition |
|---|---|---|
| public can view available menu items | SELECT | `USING (is_available = true)` |
| staff can view all menu items | SELECT | `has_permission('edit_menu') OR has_permission('view_revenue') OR has_permission('manage_staff')` |
| staff with edit_menu can manage menu | ALL | `has_permission('edit_menu')` |

> **Gap:** `view_menu`, `view_kitchen_queue`, `view_billing` are NOT in the staff menu SELECT policy. Kitchen and cashier reading menu items bypasses this via `supabaseAdmin` (service_role) in server actions. If using anon client directly, these roles cannot read menu_items.

#### `categories`
| Policy | Operation | Condition |
|---|---|---|
| public can view categories | SELECT | `USING (true)` |
| staff can manage categories | ALL | `has_permission('edit_menu')` |

#### `order_status_history`
| Policy | Operation | Condition |
|---|---|---|
| staff can view order history | SELECT | Any of: `view_orders`, `confirm_orders`, `view_kitchen_queue`, `update_prep_status`, `view_billing`, `view_revenue`, `manage_staff` |
| staff can log order history | INSERT | `WITH CHECK (true)` |

#### `roles` / `role_permissions` / `permissions`
| Policy | Operation | Condition |
|---|---|---|
| authenticated users can view [table] | SELECT | `TO authenticated USING (true)` |
| staff can manage [table] | ALL | `has_permission('manage_roles')` |

#### `staff_users`
| Policy | Operation | Condition |
|---|---|---|
| staff users can view their own profile | SELECT | `TO authenticated USING (auth_id = auth.uid())` |
| staff can view all staff | SELECT | `has_permission('manage_staff')` |
| staff with manage_staff can manage staff | ALL | `has_permission('manage_staff')` |

#### `staff_activity_log`
| Policy | Operation | Condition |
|---|---|---|
| admin can view activity log | SELECT | `has_permission('manage_staff')` |
| server can insert activity log | INSERT | `WITH CHECK (true)` |

#### `staff_attendance`
| Policy | Operation | Condition |
|---|---|---|
| allow_staff_select_attendance | SELECT | `USING (true)` |
| allow_staff_insert_attendance | INSERT | `WITH CHECK (true)` |
| allow_staff_update_attendance | UPDATE | `USING (true)` |

#### `kitchen_stations` / `station_category_map`
| Policy | Operation | Condition |
|---|---|---|
| admin can manage stations/map | ALL | `has_permission('manage_roles')` |
| kitchen can view stations/map | SELECT | `USING (true)` |

#### `order_item_status`
| Policy | Operation | Condition |
|---|---|---|
| kitchen can manage item status | ALL | `USING (true)` |

#### `restaurant_settings`
| Policy | Operation | Condition |
|---|---|---|
| admin can manage settings | ALL | `has_permission('manage_staff')` |

---

### `has_permission()` Function

```sql
CREATE OR REPLACE FUNCTION public.has_permission(perm_key text) RETURNS boolean
  LANGUAGE sql SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  select exists (
    select 1 from staff_users su
    join role_permissions rp on rp.role_id = su.role_id
    join permissions p on p.id = rp.permission_id
    where su.auth_id = auth.uid() and p.key = perm_key and su.is_active = true
  );
$$;
```

- `SECURITY DEFINER` — runs as postgres owner, can read `staff_users`/`role_permissions` even if calling user has no direct SELECT
- Checks `is_active = true` — deactivating staff instantly revokes all permissions
- No special-case for admin role — admin works because admin has all permissions in `role_permissions`
- Client-side shortcut in `useBillingState`: if role name is 'admin', all permission keys are loaded via `SELECT key FROM permissions`

---

## 3. Roles & Permissions

### Built-in Roles

| Role | is_custom |
|---|---|
| admin | false |
| waiter | false |
| kitchen | false |
| cashier | false |

### Exact Permission Assignments (from seed.sql, as implemented)

**admin** — ALL 15 permissions:
`view_orders, edit_orders, confirm_orders, view_kitchen_queue, update_prep_status, view_billing, generate_bills, edit_menu, view_menu, manage_staff, manage_roles, view_revenue, export_data, manage_tables, manage_gst`

**waiter** — 3 permissions:
`view_orders, edit_orders, confirm_orders`

**kitchen** — 2 permissions:
`view_kitchen_queue, update_prep_status`

**cashier** — 4 permissions:
`view_billing, generate_bills, edit_menu, view_menu`

### Permission Key Reference

| Key | Who Has It | What It Unlocks |
|---|---|---|
| view_orders | admin, waiter | Waiter: My Tables tab, History tab; Cashier: takeaway/table queue views |
| edit_orders | admin, waiter | Add/edit/delete order items, update qty |
| confirm_orders | admin, waiter | Accept incoming orders (Incoming tab) |
| view_kitchen_queue | admin, kitchen | KDS access, Kitchen View tab in waiter |
| update_prep_status | admin, kitchen | Start/complete kitchen orders |
| view_billing | admin, cashier | Cashier dashboard access, view bills |
| generate_bills | admin, cashier | Settle bills, create bill records |
| edit_menu | admin, cashier | Add/edit/delete menu items, Excel upload |
| view_menu | admin, cashier | View menu stock availability page |
| manage_staff | admin | Staff management, settings, activity log |
| manage_roles | admin | Roles + permissions management |
| view_revenue | admin | Analytics, revenue reports, export data |
| export_data | admin | Export tab (checked but `view_revenue` is the actual gate) |
| manage_tables | admin | Table creation, QR management |
| manage_gst | admin | GST Config tab |

### Custom Roles

Admin can create custom roles via the Roles tab. Steps:
1. Enter new role name → INSERT into `roles` with `is_custom = true`
2. Toggle permission checkboxes → INSERT/DELETE `role_permissions` rows
3. Changes are instant — next request by a staff member with that role picks up new permissions
4. Assign staff to new role via Staff tab → UPDATE `staff_users.role_id`

---

## 4. Customer Ordering Flow

### Entry Points

1. **QR Scan:** Each table has URL `http://localhost:3000/MenuCard?table={table_uuid}`. Scan resolves UUID to `table_no` server-side. Pre-fills table number on onboarding screen.
2. **Direct URL:** `/MenuCard` without param — customer enters table number manually
3. **`/menu` route:** Exists as an alias, functions identically

### Onboarding Screen Fields

| Field | Type | Validation |
|---|---|---|
| Name | text input | Required — `!customer.name` blocks submission |
| Phone | text input | Required — `!customer.phone` blocks submission |
| Table Number | number input | Required — `customer.table_no <= 0` blocks submission |
| Party Size | dropdown (1–8) | Optional — stored in client state only, **not** persisted to DB |

Before showing menu, checks via `getOrCreateTableAndCheckOccupied()` if table already has an active order — shows a warning but does not block entry.

State stored in Zustand `useCartStore` (persisted to localStorage). Session survives page refresh.

### Menu Browsing

- Sticky header with restaurant logo, guest name, cart icon + badge
- Search bar: substring match on item name across all categories
- Horizontal scrollable category pills (sticky below header)
- Scroll spy: pills auto-scroll to highlight active category as user scrolls (IntersectionObserver)
- Menu items shown per category as cards: name, price, veg/non-veg indicator dot
- Stock badges: if `stock_qty` is set, shows "Ending Soon: N Left" in amber
- Out-of-stock items are hidden (RLS `WHERE is_available = true`)

### Cart

- Floating bottom bar shows item count + total
- Opens slide-up drawer: item list, qty +/- controls, notes field per item
- Notes: free text, max visible length ~60 chars
- Stock enforcement: if `stock_qty !== null` and cart qty >= stock_qty, "+" is disabled with alert

### Order Submission (`submitCustomerOrder`)

1. Resolve `table_no → table_id` (create table row if number > 25 and not in DB)
2. Check for existing `status = 'pending'` order on this table
   - **Found:** Append new `order_items` to existing order. If order was 'served' or 'ready', transitions back to 'preparing'
   - **Not found:** Create new `orders` row with `status = 'pending'`, insert `order_items`
3. Insert `order_status_history` entry (status: 'pending', changed_by: null)
4. Return `{ success: true, orderId }`
5. `setActiveOrder(orderId)` in cart store → triggers CustomerOrderStatus view

### Order Status Tracking

Once submitted, `SaaSMenuClient` renders `CustomerOrderStatus` instead of the menu.

- Subscribes to `orders` table via Supabase realtime channel for the specific order ID
- Shows current status with descriptive label and icon
- Status progression shown: `pending → confirmed → preparing → ready → served`
- Customer **cannot**: cancel, modify, add items, or see the bill total

---

## 5. Waiter Dashboard

**Route:** `/staff/orders`  
**Component:** `WaiterDash` in `src/app/staff/orders/WaiterDash.tsx`

### Tabs (conditionally rendered by permissions)

| Tab | Permission | Visible To |
|---|---|---|
| Incoming | `confirm_orders` | waiter, admin |
| My Tables | `view_orders` | waiter, admin |
| History | `view_orders` | waiter, admin |
| Kitchen View | `view_kitchen_queue` | kitchen, admin (if waiter also has it) |
| Settings | always | all |

Default tab: if `confirm_orders` → 'incoming'; else if `view_orders` → 'tables'; else 'settings'.

### Tab: Incoming Orders

- Fetches `status = 'pending'` orders
- Each card: table number, customer name/phone, elapsed timer (red after 5 min), items list with qty
- **Accept** → `acceptAndConfirmOrder()`: `status = 'confirmed'` + history log + activity log
- **Cancel/Reject** → `cancelOrder()`: `status = 'cancelled'`
- New order sound: WebAudio sine ping at 880 Hz, plays when order count increases

### Tab: My Tables

- Fetches active orders (`pending, confirmed, preparing, ready, served`)
- Grouped by table; each table shows all active orders
- Per-order buttons:

| Button | Action | DB Change |
|---|---|---|
| Send to Kitchen | `startKitchenOrder()` | `orders.status = 'preparing'` |
| Mark Served | `markOrderServed()` | `orders.status = 'served'` |
| Send to Cashier | `sendTableToCashier()` | `orders.status = 'served'` |
| Add Items | inline picker + `addItemsToOrder()` | INSERT `order_items` |
| Update Qty | `updateOrderItemQty()` | UPDATE `order_items.qty` |
| Delete Item | `deleteOrderItem()` | DELETE `order_items` row |

Stock check in Add Items: blocks if `item.stock_qty !== null && existingCartQty >= item.stock_qty`.

### Tab: History

- Fetches `status = 'billed'` orders (last 50)
- Expandable "KOT History" per order → shows `order_status_history` timeline
- Read-only. No reprint or re-settle available.

### Tab: Kitchen View

- Read-only view of 'preparing' and 'ready' orders
- No action buttons for waiters in this view

### Realtime

Subscribes via Supabase channel `'waiter-live-orders'` to `postgres_changes` on `orders` and `order_items` tables. On any event, re-fetches full order list.

---

## 6. Kitchen Display System (KDS)

**Route:** `/staff/kitchen`  
**Component:** `KitchenDash` in `src/app/staff/kitchen/KitchenDash.tsx` (~2000 lines)

### Views

| View | Description |
|---|---|
| Grid | Default. Ticket cards in responsive grid (2–4 columns) |
| List | Compact single-column row layout |
| All-Day | Aggregated total qty per item across all active orders |

### Ticket Card Layout (per order)

- Header: KOT# (first 4 chars of UUID, uppercase), table number or "TKW" for takeaway
- Source badge: dine-in / takeaway / swiggy / zomato
- Customer name
- Elapsed timer (counting up from `created_at`)
  - Green → Yellow at `yellowThreshold` minutes (default 10)
  - Yellow → Red at `redThreshold` minutes (default 20)
- Items list:
  - Green/red dot for veg/non-veg
  - Item name and quantity
  - Per-item done checkbox (writes to `order_item_status`)
  - Notes shown in italic below item name
- Station badge (if routing enabled)
- Action buttons based on status

### Status Workflow & Buttons

| Status | Button Shown | Action |
|---|---|---|
| pending | "Start Preparing" (green) | `startKitchenOrder()` → status = 'preparing' |
| confirmed | "Start Preparing" (green) | `startKitchenOrder()` → status = 'preparing' |
| preparing | "All Done → Mark Ready" | `markKitchenOrderReady()` → status = 'ready', all order_items.status = 'ready' |
| ready | "READY" badge (green pulse) | Auto-bumped from view after 30s if `autoBump = true` |
| served | Shown dimmed in history panel | No buttons |

Per-item done checkbox: calls `toggleOrderItemDone()` → upserts `order_item_status` row. Visual only — does not change order or order_item status in main tables.

### KDS Settings (stored in `restaurant_settings.kds_config` as JSON)

```typescript
{
  ticketView: 'grid' | 'list' | 'allday',  // default: 'grid'
  fontSize: 'sm' | 'md' | 'lg',            // default: 'md'
  autoBump: boolean,                        // default: true
  timerDirection: 'up' | 'down',           // default: 'up'
  yellowThreshold: number,                  // default: 10 (minutes)
  redThreshold: number,                     // default: 20 (minutes)
  soundNewOrder: boolean,                   // default: true
  soundOverdue: boolean,                    // default: true
  autoPrintOnConfirm: boolean,              // default: false
  printEnabled: boolean,                    // default: true
  printerName: string,                      // default: ''
  prepTimes: Record<categoryName, minutes>  // display only
}
```

Settings saved to `restaurant_settings.kds_config` via `saveKdsConfig()` server action.

### Station Routing

- Enabled via `restaurant_settings.station_routing_enabled`
- When enabled, filter buttons per station appear in KDS header
- Station assignment uses a **client-side hardcoded map** (`STATION_ROUTING_MAP` in KDS code), not the DB `station_category_map` table
- The DB `station_category_map` table is managed via Admin but not queried live by KDS
- **Discrepancy:** DB seed maps "Briyani" category to "Biriyani & Mandi" station. Client map uses "Biriyani" as a key. Case/spelling mismatches cause routing to silently show tickets as "Unrouted."

### KOT Print Format

Browser popup via `window.open()`. Paper width: 80mm.

Content:
- `HOTEL TAJ OOTY` (centered, bold)
- KOT# and table number
- Customer name and date/time
- Items: `[●veg/non-veg] qty × ItemName`
- Notes per item (italic)
- Footer: "Kitchen Copy Only — Not a Bill"

Auto-print: if `autoPrintOnConfirm = true`, `printKOT()` is called when status transitions to 'confirmed'.

### All-Day View

Aggregates all non-billed orders. For each unique menu item, shows:
- Item name + veg/non-veg dot
- Total quantity across all active tickets
- Table numbers that ordered it

Useful for prep planning at start of service. Not persisted anywhere — purely computed from live order state.

### Sound Alerts

Web Audio API (`AudioContext`):
- New order: 880 Hz sine wave, 0.4s, volume 0.3
- Overdue order: 440 Hz
- Mute toggle in KDS header
- Falls back silently if browser blocks audio (requires user interaction first)

---

## 7. Cashier & Billing

**Route:** `/staff/billing`  
**Component:** `BillingDash` with `useBillingState` hook

### Sidebar Navigation (actual state)

| Item | Permission Required | Routes To | Status |
|---|---|---|---|
| Dashboard Overview | `view_billing` | `bento` view | ✅ |
| Dine-In Floor Map | `view_orders` | `tables` view | ✅ |
| Takeaway Counter Queue | `view_orders` | `takeaway` view | ✅ |
| Online Delivery Queue | `view_orders` | `online_orders` view | ✅ |
| Kitchen Tickets Queue | `view_kitchen_queue` | `setActiveOpModal('Kitchen Tickets')` | ❌ Nothing renders |
| Menu Stock Availability | `view_menu` | `stock_inventory` view | ✅ |
| Staff Roster | `manage_staff` | `setActiveOpModal('Staff Roster')` | ❌ Nothing renders |
| Register Drawer Shift | `manage_cash_drawer` | — | ❌ Permission key missing from DB |
| Petty Cash Expenses | `manage_expenses` | — | ❌ Permission key missing from DB |
| GST Configuration | `manage_gst` | `setActiveOpModal('GSTConfig')` | ❌ Nothing renders |
| History & Audit | `view_billing` | `setActiveOpModal('History')` | ❌ Nothing renders |
| Export Data | `export_data` | `setActiveOpModal('Export')` | ❌ Nothing renders |

### Bill Calculation (`getCheckoutCalculation`)

```
subtotal = sum(item.price_at_order × qty) across all orders on table
discountAmt:
  if type = 'amt': min(discountValue, subtotal)
  if type = 'pct': min(subtotal × discountValue / 100, subtotal)
taxableAmount = subtotal - discountAmt

if (settings.isGstInclusive):
  baseAmount = taxableAmount / (1 + gstRate/100)
  totalGst = taxableAmount - baseAmount
  cgst = sgst = totalGst / 2
  grand = taxableAmount   ← GST already inside price

else (exclusive — default):
  cgst = taxableAmount × (gstRate/2) / 100
  sgst = taxableAmount × (gstRate/2) / 100
  service = 0             ← always 0, removed per requirement
  grand = taxableAmount + cgst + sgst
```

GST rate source:
- `'Regular Scheme (5% GST No ITC)'` → 5%
- `'Regular Scheme (18% GST with ITC)'` → 18%
- `'Composition Scheme'` → treated as 5%

### Preset Coupons (hardcoded, not DB-backed)

| Code | Type | Value |
|---|---|---|
| TAJ10 | % | 10% off |
| WELCOME50 | ₹ | ₹50 flat |
| FESTIVE15 | % | 15% off |
| VIP200 | ₹ | ₹200 flat |

Manual discount also available as number + type selector.

### Payment Methods

UI shows 3 options: Cash, Card, UPI. **Not stored in `bills` table** — the `bills` table has no `payment_method` column. Payment method is lost after settlement.

### Settlement Flow

1. Cashier clicks "Settle Bill" button
2. Checks: `isRegisterOpen` must be true (blocks otherwise)
3. Calculates grand total via `getCheckoutCalculation()`
4. INSERT into `bills`: `{ order_id, total, cashier_id, paid_at: now() }`
5. UPDATE all table's active orders: `status = 'billed'`
6. INSERT `order_status_history` entry
7. Clear `selectedTable` state

### Bill Print Format

Browser popup (`window.open()`). Width: 80mm or 58mm based on settings.

Content:
- Header note (from settings, default: "HOTEL TAJ OOTY")
- Restaurant name line (hardcoded "Hotel Taj Ooty" — not reading from settings)
- Table number or token number + date
- Guest name + time
- Items: name, qty × price, amount
- Subtotal, CGST, SGST line items
- GRAND TOTAL (bold)
- Payment method selected
- "Thank you" footer

### Day Statistics (Bento Dashboard)

| Stat | Source | Accuracy |
|---|---|---|
| Today's Revenue | Sum of billed order totals with GST | ✅ Accurate |
| Bills Today | Count of 'billed' orders today | ✅ Accurate |
| Average Bill | Revenue / Bills | ✅ Accurate |
| Active Tables | Tables with non-empty status | ✅ Accurate |
| Cash / UPI / Card Split | **Simulated** — bills distributed by `index % 3` | ❌ Not accurate — payment method not stored |

### Menu Stock Availability (Cashier View)

Full-page grid of all menu items. Per-item:
- Status badge: In Stock / Limited: N / Out of Stock
- "✓ In Stock" button → `UPDATE menu_items SET is_available=true, stock_qty=null`
- "✗ Out of Stock" button → `UPDATE menu_items SET is_available=false, stock_qty=null`
- Qty input (blur or Enter to save) → `UPDATE menu_items SET is_available=true, stock_qty=N`
- Search bar (client-side DOM filter, not a re-query)

---

## 8. Admin Dashboard

**Route:** `/staff/admin`  
**Component:** `AdminDash` with sub-components per tab

Realtime: subscribes to `orders`, `order_items`, `order_status_history`, `roles`, `role_permissions`, `permissions`. Polls every 30 seconds as fallback.

### Tabs

| Tab ID | Component | Status |
|---|---|---|
| Overview | `AdminOverview` | ✅ Live revenue/orders/tables/visits stats |
| Orders | `AdminOrders` | ✅ All orders filterable by status |
| Tables | `AdminTablesLive` | ✅ Live floor map, read-only from cashier |
| Menu | `AdminMenuSync` | ✅ CRUD + Excel upload |
| Staff | `AdminStaff` | ✅ Full CRUD |
| Roles | `AdminRoles` | ✅ Create/edit roles + permission toggles |
| Customers | `AdminCRM` | ✅ Derived from order history (no separate customer table) |
| Analytics | `AdminAnalytics` | ✅ Charts from client-side computed data |
| Export | `AdminExport` | ✅ 5 Excel exports |
| GSTConfig | `AdminGSTConfig` | ✅ Full GST settings form |
| Activity | `AdminActivityLog` | ✅ Shows `staff_activity_log` |
| Settings | `AdminSettings` | ✅ Restaurant settings form |

### Tables Management

- Shows all 25 tables with live status (Available / Occupied)
- Occupied tables show: current bill amount, customer name
- Admin can click to view active orders per table
- QR URL shown as text — **no actual QR image rendered** (no qrcode library integrated)
- QR URL format: `http://localhost:3000/MenuCard?table={uuid}` (hardcoded localhost)

### Menu Management

- View all menu items with category, price, availability
- Inline edit: name, price, category
- Toggle `is_available`
- Delete item
- **Excel Upload format:**
  - Required columns: `Category`, `Item Name`, `Price`, `Available` (Yes/No)
  - Parsed client-side via SheetJS
  - Upserts to Supabase: creates category if not exists, inserts/updates menu_items

### Excel Exports (AdminExport)

| Export | Filename | Columns |
|---|---|---|
| Orders | `taj-ooty-orders.xlsx` | Order ID, Date, Table, Customer Name, Customer Phone, Items (condensed "name xqty" string), Total, Status, Waiter, Billed At |
| Menu | `taj-ooty-menu.xlsx` | Category, Item Name, Price, Available |
| Staff | `taj-ooty-staff.xlsx` | Name, Phone, Role, Status, Created At, Last Login |
| Customers | `taj-ooty-customers.xlsx` | Phone, Name, Total Visits, Total Spent, Last Visit |
| Revenue | `taj-ooty-revenue.xlsx` | Month (YYYY-MM), Total Orders, Total Revenue, Average Order Value |

All exports are client-side browser downloads. The "Last Login" column in staff export will always be "—" — no last_login field in staff_users.

### Analytics Tab

All analytics computed client-side from the orders array loaded at dashboard init:
- Monthly revenue chart (grouped by `created_at` month)
- Top-selling items (order_items aggregated by menu_item name)
- Order status distribution (pie/bar)
- Revenue by source (dine-in / takeaway / online)

No dedicated analytics DB queries or materialized views.

### GST Configuration (AdminGSTConfig)

Full form persisting to `restaurant_settings`:
- GSTIN field with regex validation: `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`
- Tax scheme selector (3 options, sets GST rate for billing)
- State of registration (all 36 Indian states + UTs)
- HSN/SAC code for services (default: 996331)
- Tax component matrix shown (CGST/SGST auto-split from total rate)
- Aggregator mappings: Swiggy, Zomato, Direct Delivery with GSTIN + liability model

---

## 9. Known Gaps / Incomplete Features

### Broken / Non-Functional

| Issue | File(s) | Details |
|---|---|---|
| Kitchen Tickets, Staff Roster, History, Export, GSTConfig sidebar items in cashier | `BillingSidebar.tsx`, `BillingDash.tsx` | These IDs fall to `setActiveOpModal()` but no modal renders for them. Clicking shows nothing. |
| Cash/UPI/Card day stats split | `useBillingState.ts` ~L272-278 | Payment method not in DB. Split simulated by `index % 3` distribution. Shown as revenue analytics — misleading. |
| `manage_cash_drawer` permission | `BillingSidebar.tsx` | Key not in `permissions` table. Always denied. Register Drawer Shift item always blocked. |
| `manage_expenses` permission | `BillingSidebar.tsx` | Same — Petty Cash Expenses always blocked. |
| QR code image display | `AdminTablesLive.tsx` | Shows URL as plain text. No QR image library. |
| Bill history reprint | `BillingHistory.tsx` | No reprint button on historical bills. `bills` table only stores `total`, not item breakdown. |
| Online order accept/reject | `BillingOnlineOrders.tsx` | Queue shown but no action buttons to accept/reject simulated Swiggy/Zomato orders. |

### Partially Working

| Feature | Status | Gap |
|---|---|---|
| Staff attendance | Clock-in/out implemented in cashier bento | No shift summary, overtime calc, or admin view of attendance. |
| KOT per-item done checkbox | Writes to `order_item_status` | State may not persist across full re-renders if hook doesn't include `order_item_status` in subscription. |
| Station routing | Works if category names match hardcoded JS map | DB `station_category_map` not queried live. Name mismatches cause silent failure. |
| Petty expenses | UI accepts entries in cashier bento | No `expenses` table in DB — stored in React state only, lost on refresh. |
| Cash register session | UI tracks open/close with opening float | Client state only — not persisted to DB. Resets on page refresh. |
| Token numbers | `token_no` column exists in orders | Not consistently assigned in all flows. |
| Waiter catalog stock_qty | Sometimes missing | Depends on which code path fetches catalog. Not always included in all JOIN queries. |

### Hardcoded Values (Should Be Dynamic)

| Value | Location | Notes |
|---|---|---|
| "Hotel Taj Ooty" in bill HTML | `useBillingState.ts` ~L413 | Should read `settings.restaurantName` from restaurant_settings |
| 4 preset coupons | `BillingCheckout.tsx` + `useBillingState.ts` | No DB table for coupons. Hardcoded array. |
| QR base URL `http://localhost:3000` | `seed.sql` L218 | Will break in production. Should be `NEXT_PUBLIC_SITE_URL`. |
| KDS prep times | `DEFAULT_KDS_SETTINGS` in KitchenDash | Stored in settings JSON but default values are client-hardcoded. |
| Supabase realtime table list | migrations | Adding new tables to realtime requires explicit `ALTER PUBLICATION` migration. |

### Missing vs Mature POS Systems

| Feature | Status |
|---|---|
| KOT reprint from kitchen | Not implemented |
| Table transfer | Not implemented |
| Item-level discount | Not implemented — discount is order-level only |
| Portion sizes / variants | Not implemented — single price per item |
| HSN code per menu item | Not in `menu_items` schema — only default HSN in settings |
| Customer GSTIN input at checkout | Setting exists but no input field in bill flow |
| Server-side stock reservation (race condition protection) | Not implemented — all stock checks are client-side |
| Payment method persistence | Not stored in DB |
| Multi-KOT (separate KOTs for same table) | Partially — appends items, doesn't create separate tickets clearly |
| Loyalty points / CRM rewards | Not implemented |
| Shift-end reports (Z report) | Not implemented |
| Real Swiggy/Zomato webhook integration | UI toggle + simulate button only |
| Native printer integration (ESC/POS) | Not implemented — browser popup only |

---

## 10. Environment & Deployment

### Required Environment Variables

```bash
# .env.local

# ACTIVE — Local Supabase
NEXT_PUBLIC_SUPABASE_URL="http://localhost:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"
SUPABASE_SERVICE_ROLE_KEY=<redacted>
NEXT_PUBLIC_SITE_URL="http://localhost:3000"

# COMMENTED OUT — Cloud Supabase backup
# NEXT_PUBLIC_SUPABASE_URL=https://shgarlpvtvifcjlqlqtw.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
# SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

`SUPABASE_SERVICE_ROLE_KEY` — used in Server Actions via `supabaseAdmin` client (bypasses RLS). Never exposed to browser.

`NEXT_PUBLIC_SUPABASE_ANON_KEY` — used in client components. Subject to RLS policies.

### Supabase Clients in Use

| Client | File | Used Where |
|---|---|---|
| `supabaseAdmin` | `src/features/ordering/lib/supabaseAdmin.ts` | Server Actions (mutations, RLS bypass) |
| `supabase` (browser) | `src/features/ordering/lib/supabase.ts` | Client components, realtime subscriptions |
| `createSupabaseServerClient` | `src/features/ordering/lib/supabaseServer.ts` | Auth verification in server components |

### Local Setup

```bash
supabase start          # starts local Postgres + Auth + Realtime
npm run dev             # starts Next.js on port 3000
# Supabase Studio: http://localhost:54323
```

Migrations are applied incrementally (not via reset). 22 migration files total.

### Test Accounts (Local)

| Email | Password | Role |
|---|---|---|
| admin@tajooty.com | Admin@123 | admin |
| waiter@tajooty.com | Waiter@123 | waiter |
| kitchen@tajooty.com | Kitchen@123 | kitchen |
| cashier@tajooty.com | Cashier@123 | cashier |
| admin@taj.com | password123 | admin |
| waiter@taj.com | password123 | waiter |
| kitchen@taj.com | password123 | kitchen |
| cashier@taj.com | password123 | cashier |

### Deployment Status

| Target | Status |
|---|---|
| Local development | ✅ Running on `http://localhost:3000` |
| Cloud Supabase | ⚠️ Project exists but not actively used |
| Vercel (production) | ❌ Not deployed |

**Blockers for cloud/Vercel deployment:**
1. All QR URLs hardcoded to `http://localhost:3000` — must be updated to production domain
2. Local Supabase keys in `.env.local` — must switch to cloud keys
3. Migrations need to be applied to cloud DB (via `supabase db push` or Supabase Studio)
4. `service_role` key must be added as Vercel environment secret

---

*Documentation generated from direct inspection of 22 migration files, seed.sql, and all source files in `/src/app/staff/` and `/src/features/ordering/`. July 2026.*
