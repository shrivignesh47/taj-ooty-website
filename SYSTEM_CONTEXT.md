# SYSTEM_CONTEXT.md

> **Generated:** 2026-08-19 from live codebase inspection.
> **Source of truth:** Written by reading every file. Re-generate when codebase changes significantly.

---

## 1. Project Overview

**Product name:** Hotel Taj Ooty - Restaurant Website + POS System (Taj OS / Taj POS)

**What it does:**

1. **Public marketing website** - Animated Next.js landing page: Hero (video bg), About, Gallery, Menu Preview (21 categories), Testimonials (7 real Google reviews), Instagram feed, Visit/Contact. Replaces hoteltajooty.in.

2. **Internal restaurant POS** - Multi-role POS covering the full order lifecycle: customer QR self-ordering, waiter queue, real-time KDS, cashier billing with multi-tender payments (cash/card/UPI/split), GST-compliant receipts, coupon redemption, loyalty points, staff attendance, petty cash, cash register sessions, admin analytics (Recharts), live floor map, audit logs, Excel export.

**Stage:** Active development, running locally at http://localhost:3000 against local Supabase. Cloud project (shgarlpvtvifcjlqlqtw.supabase.co) exists but is commented out. NOT deployed to Vercel yet.

**Business model:** Single-client restaurant. src/features/ordering is a generic SaaS-portable module designed for future multi-tenant extraction.

| Role | Who | Access |
|---|---|---|
| Customer | Restaurant guests (anonymous) | QR scan -> /MenuCard |
| Waiter | Floor staff | /staff/orders |
| Kitchen | Kitchen staff | /staff/kitchen |
| Cashier | Billing counter | /staff/billing |
| Admin | Owner/manager | /staff/admin |

---

## 2. Tech Stack

| Layer | Technology | Detail |
|---|---|---|
| Framework | Next.js 16.2.10 | App Router ONLY - no Pages Router |
| Language | TypeScript 5 | strict mode ON |
| Styling | Tailwind CSS v4 | @tailwindcss/postcss, config-free API |
| Icons | Lucide React 1.23.0 | |
| Animation | Framer Motion 12.42.2 | |
| State | Zustand 5.0.14 | Customer cart only |
| Charts | Recharts 3.9.2 | Admin analytics |
| Database | Supabase (PostgreSQL 17) | Local: localhost:54321, Cloud: shgarlpvtvifcjlqlqtw |
| Auth | Supabase Auth | Email/password via @supabase/ssr v0.12 |
| Realtime | Supabase Realtime | WebSocket Postgres subscriptions |
| Excel | SheetJS (xlsx) 0.18.5 | Admin data export |
| QR codes | qrcode.react 4.2.0 | Table QR generation |
| Thermal print | QZ Tray (qz-tray) 2.2.6 | ESC/POS; window.print() fallback |
| Date utils | date-fns 4.4.0 | |
| Fonts | Google Fonts (next/font) | Fraunces (display), Work Sans (body) |
| Hosting | Vercel (planned) | Not yet deployed |
| Aggregators | Swiggy, Zomato | Webhook scaffolded; not activated |

---

## 3. Project Structure

`
taj-ooty-website/
src/
  app/                            # App Router pages & layouts
    layout.tsx                    # Root layout: fonts, metadata
    page.tsx                      # Marketing homepage (/)
    globals.css                   # Design tokens + Tailwind @theme
    MenuCard/page.tsx             # Customer QR ordering (/MenuCard)
    menu/                         # Redirect alias for /MenuCard
    staff/
      login/                      # /staff/login
        page.tsx
        LoginForm.tsx             # use client login form
      dashboard/page.tsx          # Role-based redirect dispatcher
      orders/                     # Waiter dashboard /staff/orders
        page.tsx
        WaiterDash.tsx            # ~137KB use client component
        components/
          IncomingOrders.tsx
          ActiveOrders.tsx
          OrderHistory.tsx
      kitchen/                    # KDS /staff/kitchen
        page.tsx
        KitchenDash.tsx           # ~115KB use client component
      billing/                    # Cashier POS /staff/billing
        page.tsx
        BillingDash.tsx           # ~66KB main component
        types.ts
        hooks/
        components/               # 15 billing sub-components
          BillingCheckout.tsx (~45KB)
          BillingHeader.tsx
          BentoDashboard.tsx
          BillingTakeaway.tsx, BillingTakeawayCreator.tsx
          BillingOnlineOrders.tsx, BillingReports.tsx
          BillingHistory.tsx, BillingSidebar.tsx
          BillingWorkspaceNav.tsx
          CouponManagementModal.tsx
          PrinterSettingsModal.tsx
          AggregatorGatesCard.tsx
          CustomizeDashboardDrawer.tsx
          utils.ts
      admin/                      # Admin panel /staff/admin
        page.tsx
        AdminDash.tsx             # ~31KB shell
        components/               # 14 admin sub-components
          AdminOverview.tsx, AdminAnalytics.tsx
          AdminMenuSync.tsx, AdminStaff.tsx
          AdminRoles.tsx, AdminTables.tsx
          AdminTablesLive.tsx (~38KB)
          AdminOrders.tsx
          AdminGSTConfig.tsx (~32KB)
          AdminSettings.tsx (~36KB)
          AdminLoyalty.tsx (~37KB)
          AdminCRM.tsx, AdminActivityLog.tsx
          AdminExport.tsx
    api/webhooks/aggregators/     # Swiggy/Zomato webhooks (scaffolded)
    debug-auth/ fix-admin2/ seed-admin/ test-db/  # DEV ONLY - delete before prod
  components/                     # Marketing site components
    Navbar.tsx, Hero.tsx, HeroCarousel.tsx
    About.tsx, Gallery.tsx, MenuBook.tsx (~15KB)
    MenuPreview.tsx, Testimonials.tsx
    InstagramFeed.tsx, Visit.tsx, Footer.tsx
    OffersBanner.tsx, WeatherWidget.tsx (~22KB)
    NotificationCenter.tsx (~35KB), Toaster.tsx
  features/ordering/              # CORE SaaS ordering module
    index.ts                      # Export barrel
    actions/                      # ALL Server Actions
      auth.ts                     # loginStaff, logoutStaff, verifyStaff
      adminActions.ts             # Table/menu/staff/role CRUD (~29KB)
      waiterActions.ts            # Order confirm/cancel/update (~18KB)
      billingActions.ts           # Bill settlement, register (~14KB)
      submitOrder.ts              # Customer order submission
      updateOrderStatus.ts        # KDS status progression
      staffActions.ts             # Staff CRUD
      couponActions.ts            # Coupon validate/apply
      loyaltyActions.ts           # Loyalty points earn/redeem
      notificationActions.ts      # Staff broadcast notifications
      dashboardPrefActions.ts     # Widget layout preferences
      fetchAdminStats.ts          # Admin analytics aggregation
      getOrderStatus.ts           # Customer order status polling
    api/getCatalog.ts             # getLiveCatalog() - menu + categories
    components/
      SaaSMenuClient.tsx          # Customer ordering UI (~30KB)
      CustomerOrderStatus.tsx     # Customer live status tracker
      CustomizeDashboardModal.tsx
    config/widgetCatalog.ts       # Per-role dashboard widget definitions
    hooks/useLiveOrders.ts        # Supabase Realtime subscription hook
    lib/
      supabase.ts                 # Browser anon client (createBrowserClient)
      supabaseAdmin.ts            # Server service_role client (bypasses RLS)
      supabaseServer.ts           # SSR cookie-based server client
      types.ts                    # TypeScript interfaces for all DB types
      escpos.ts                   # ESC/POS thermal print formatting
      thermalPrint.ts             # QZ Tray print dispatcher
      toast.ts                    # Toast notification helper
    store/useCartStore.ts         # Zustand cart + customer session store
  lib/
    data.ts                       # Static: menuCategories, testimonials, siteInfo
    shapes.ts                     # SVG shape helpers
    weatherSuggestions.ts         # Weather-based food suggestions
  types/qz-tray.d.ts              # QZ Tray TypeScript declarations
  middleware.ts                   # Edge middleware: /staff/* auth guard
  proxy.ts                        # Proxy utility (unclear purpose)
supabase/
  config.toml                     # Supabase CLI config (PostgreSQL 17, port 54321)
  seed.sql                        # Full DB seed (~488 lines)
  migrations/                     # 37 ordered migration files (000-036)
scripts/                          # One-off utility scripts
public/                           # Static assets
android/ ios/                     # Mobile stubs (future)
next.config.ts                    # allowedDevOrigins: [192.168.29.46]
tsconfig.json                     # strict mode, paths: @/* -> src/*
package.json
AGENTS.md                         # AI coding agent rules
SYSTEM_DOCUMENTATION.md          # Detailed as-built docs (July 2026)
`

---

## 4. Database Schema

All tables have **RLS ENABLED**. Permission checks via has_permission(perm_key text) - a SECURITY DEFINER SQL function joining staff_users -> role_permissions -> permissions using uth.uid().

### Core Tables

#### bills
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| order_id | uuid | FK -> orders.id |
| total | numeric(10,2) | NOT NULL |
| cashier_id | uuid | FK -> staff_users.id |
| paid_at | timestamptz | nullable |
| payment_method | text | cash, card, upi, split |

#### categories
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | NOT NULL |
| sort_order | int | DEFAULT 0 |

Seeded (~21): Soup, Sandwiches, Starters, Shawarma, Tandoori, Biriyani, Kuzhimandi, Egg Dishes, Chicken Gravy, Mutton Gravy, Veg Gravy, Sea Food, Chinese, Rice and Noodles, Drinks, Ice Cream, Milk Shake, Dessert, etc.

#### menu_items
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| category_id | uuid | FK -> categories.id |
| name | text | NOT NULL |
| price | numeric(10,2) | NOT NULL |
| image_url | text | nullable |
| is_available | boolean | DEFAULT true |
| is_veg | boolean | DEFAULT false (migration 004) |
| stock_qty | integer | nullable; NULL = unlimited (migration 022) |

~175 items seeded.

#### order_items
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| order_id | uuid | FK -> orders.id |
| menu_item_id | uuid | FK -> menu_items.id |
| qty | int | NOT NULL, CHECK qty > 0 |
| notes | text | nullable |
| price_at_order | numeric(10,2) | NOT NULL |
| status | text | pending, ready, cancelled |
| discount_percent | numeric(5,2) | DEFAULT 0 (migration 032) |
| discount_reason | text | nullable (migration 032) |

#### orders
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| table_id | uuid | FK -> restaurant_tables.id |
| customer_name | text | NOT NULL |
| customer_phone | text | NOT NULL |
| status | text | NOT NULL, DEFAULT pending |
| waiter_id | uuid | FK -> staff_users.id |
| created_at | timestamptz | DEFAULT now() |
| token_no | text | nullable - takeaway token (migration 015) |
| source | text | DEFAULT dine_in; values: dine_in, takeaway, swiggy, zomato |

**Order Status Flow:**
`
pending -> confirmed -> preparing -> ready -> served -> billed
                     -> cancelled
                     -> on_hold
`

#### order_status_history
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| order_id | uuid | FK -> orders.id |
| status | text | NOT NULL |
| changed_by | uuid | FK -> staff_users.id |
| changed_at | timestamptz | DEFAULT now() |

### RBAC Tables

#### permissions
| Column | Type |
|---|---|
| id | uuid PK |
| key | text NOT NULL |

Core (15): view_orders, edit_orders, confirm_orders, view_kitchen_queue, update_prep_status, view_billing, generate_bills, edit_menu, view_menu, manage_staff, manage_roles, view_revenue, export_data, manage_tables, manage_gst

Additional (later migrations): manage_cash_drawer, manage_expenses, manage_inventory, view_settings, manage_settings, manage_loyalty, manage_coupons

> WARNING: Some UI code references permissions that may not exist in DB. Always verify in Studio.

#### roles
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | NOT NULL |
| is_custom | boolean | DEFAULT false |
| created_at | timestamptz | |

Seeded: admin, waiter, kitchen, cashier

#### role_permissions
| Column | Notes |
|---|---|
| role_id | PK part, FK -> roles.id |
| permission_id | PK part, FK -> permissions.id |

#### staff_users
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| auth_id | uuid UNIQUE | FK -> auth.users.id |
| name | text | NOT NULL |
| phone | text | nullable |
| role_id | uuid | FK -> roles.id |
| is_active | boolean | DEFAULT true |
| created_at | timestamptz | |

### Operations Tables

#### restaurant_tables
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| table_no | int | NOT NULL |
| qr_code_url | text | nullable |
| assigned_waiter_id | uuid | FK -> staff_users.id |

25 tables seeded (T1-T25). QR URLs: http://localhost:3000/MenuCard?table={id}

#### restaurant_settings (single-row config)

Key columns (added across migrations): restaurant_name, gst_number, fssai_number, address, phone, email, website, service_charge_percent (DEFAULT 0), auto_print_on_accept (false), printer_name, print_kot (true), print_bill (true), kds_config (jsonb), station_routing_enabled (false), legal_business_name, trade_name, gstin, tax_scheme (DEFAULT Regular Scheme 5pct GST No ITC), registration_state (DEFAULT Tamil Nadu), default_hsn_code (DEFAULT 996331), enable_ecommerce_tax (false), pricing_strategy (exclusive), print_gstin_bill (true), print_cgst_sgst_split (true), print_hsn_items (true), print_customer_gstin (true), aggregator_mappings (jsonb), swiggy_enabled (false), zomato_enabled (false), loyalty_enabled (true), loyalty_points_per_rupee (1), loyalty_redemption_rate (0.5)

#### kitchen_stations
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | UNIQUE |
| color | text | DEFAULT #C9974A |
| is_active | boolean | DEFAULT true |
| sort_order | int | DEFAULT 0 |

Seeded (7): Tandoor and Grill, Curries and Gravy, Biriyani and Mandi, Starters, Breads and Naan, Beverages, Desserts

#### station_category_map
| Column | Notes |
|---|---|
| station_id | PK, FK -> kitchen_stations.id ON DELETE CASCADE |
| category_id | PK, FK -> categories.id ON DELETE CASCADE |

#### order_item_status (KDS per-item tracking)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| order_item_id | uuid | FK -> order_items.id ON DELETE CASCADE, UNIQUE |
| is_done | boolean | DEFAULT false |
| marked_by | uuid | FK -> staff_users.id |
| marked_at | timestamptz | |

### Staff and Audit Tables

#### staff_activity_log
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| staff_id | uuid | FK -> staff_users.id ON DELETE SET NULL |
| action | text | LOGIN, LOGOUT, ORDER_CONFIRMED, ORDER_BILLED, etc. |
| details | jsonb | nullable |
| created_at | timestamptz | |

#### staff_attendance
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| staff_id | uuid | FK -> staff_users.id ON DELETE CASCADE |
| clock_in | timestamptz | NOT NULL, DEFAULT now() |
| clock_out | timestamptz | nullable |
| status | text | DEFAULT active |
| created_at | timestamptz | |

#### staff_notifications
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| sender_name | text | NOT NULL |
| sender_role | text | DEFAULT Staff |
| title | text | NOT NULL |
| message | text | NOT NULL |
| target_role | text | DEFAULT all |
| priority | text | DEFAULT normal |
| read_by | jsonb | DEFAULT [] - array of staff IDs who read it |
| created_at | timestamptz | |

### Billing Extension Tables

#### bill_payments (multi-tender splits)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| bill_id | uuid | FK -> bills.id ON DELETE CASCADE |
| payment_method | text | cash, card, upi |
| amount | numeric(10,2) | CHECK amount > 0 |
| created_at | timestamptz | |

#### coupons
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| code | text | UNIQUE |
| type | text | pct (percentage) or amt (flat amount) |
| value | numeric(10,2) | |
| is_active | boolean | DEFAULT true |
| valid_from | timestamptz | |
| valid_until | timestamptz | nullable |
| usage_limit | int | nullable |
| times_used | int | DEFAULT 0 |

Seeded: TAJ10 (10%), WELCOME50 (Rs.50 flat), FESTIVE15 (15%), VIP200 (Rs.200 flat)

#### customer_loyalty
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| customer_phone | text | UNIQUE - primary identity key |
| customer_name | text | nullable |
| points_balance | numeric(10,2) | DEFAULT 0 |
| lifetime_points_earned | numeric(10,2) | DEFAULT 0 |
| lifetime_visits | int | DEFAULT 0 |
| created_at, updated_at | timestamptz | |

#### loyalty_transactions
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| customer_phone | text | FK -> customer_loyalty.customer_phone |
| bill_id | uuid | FK -> bills.id |
| type | text | earned, redeemed, adjusted |
| points | numeric(10,2) | |
| note | text | nullable |
| created_at | timestamptz | |

#### cash_register_sessions
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| cashier_id | uuid | FK -> staff_users.id |
| opening_float | numeric(10,2) | DEFAULT 0 |
| closing_amount | numeric(10,2) | nullable |
| opened_at | timestamptz | |
| closed_at | timestamptz | nullable |
| status | text | open or closed |

#### petty_expenses
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| register_session_id | uuid | FK -> cash_register_sessions.id |
| description | text | NOT NULL |
| amount | numeric(10,2) | CHECK amount > 0 |
| recorded_by | uuid | FK -> staff_users.id |
| created_at | timestamptz | |

#### dashboard_preferences
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| staff_id | uuid | FK -> staff_users.id, UNIQUE |
| visible_widgets | jsonb | DEFAULT [] |
| widget_order | jsonb | DEFAULT [] |
| updated_at | timestamptz | |

### Key SQL Functions and Triggers

| Name | Type | Purpose |
|---|---|---|
| has_permission(perm_key text) | SQL Function (SECURITY DEFINER) | Core RBAC. Joins staff_users->role_permissions->permissions via auth.uid(). Used in ALL RLS policies. |
| rls_auto_enable() | Event Trigger | Auto-enables RLS on every new public schema table. |
| check_and_decrement_stock() | Trigger Function (SECURITY DEFINER) | BEFORE INSERT on order_items. Atomically decrements stock_qty. Raises STOCK_EXHAUSTED if insufficient. |
| trg_check_stock_on_order_item | DB Trigger | Invokes check_and_decrement_stock() before each order_items INSERT. |

### Realtime Publication

Tables in supabase_realtime publication (REPLICA IDENTITY FULL):
- orders
- order_items
- restaurant_tables

Not in realtime: menu_items, order_status_history, kitchen_stations, staff_activity_log

---

## 5. Features and Modules

### 5.1 Public Marketing Website
- Routes: /
- Key components: Navbar, Hero, About, Gallery, MenuPreview, Testimonials, InstagramFeed, Visit, Footer, OffersBanner, WeatherWidget
- Tables: None (fully static)
- Status: Complete - needs real photos/video assets

### 5.2 Customer QR Ordering
- Routes: /MenuCard, /menu (redirect)
- Key components: SaaSMenuClient.tsx, CustomerOrderStatus.tsx, useCartStore.ts
- Server Actions: submitOrder.ts, getOrderStatus.ts
- Reads: categories, menu_items, restaurant_tables
- Writes: orders, order_items, order_status_history
- Status: Complete

### 5.3 Waiter Dashboard
- Routes: /staff/orders
- Key components: WaiterDash.tsx, IncomingOrders.tsx, ActiveOrders.tsx, OrderHistory.tsx
- Server Actions: waiterActions.ts, updateOrderStatus.ts
- Status: Complete

### 5.4 Kitchen Display System (KDS)
- Routes: /staff/kitchen
- Key components: KitchenDash.tsx
- Server Actions: updateOrderStatus.ts
- Status: Complete (KOT tickets, per-item tick-off, station routing, audio alerts)

### 5.5 Billing / Cashier POS
- Routes: /staff/billing
- Key components: BillingDash.tsx, BillingCheckout.tsx, BentoDashboard.tsx, CouponManagementModal.tsx, AggregatorGatesCard.tsx
- Server Actions: billingActions.ts, couponActions.ts, loyaltyActions.ts, dashboardPrefActions.ts
- Status: Mostly complete. Swiggy/Zomato live webhook needs partner API credentials.

### 5.6 Admin Panel
- Routes: /staff/admin
- Key components: AdminDash.tsx + 14 sub-components in admin/components/
- Server Actions: adminActions.ts, fetchAdminStats.ts, staffActions.ts
- Tables: ALL tables
- Status: Mostly complete; some large components may have edge cases

### 5.7 Staff Authentication
- Routes: /staff/login, /staff/dashboard
- Key files: middleware.ts, auth.ts, LoginForm.tsx, supabaseServer.ts
- Status: Complete

---

## 6. Auth and Roles

### Auth Flow
1. Request to /staff/* -> middleware.ts intercepts
2. middleware calls supabase.auth.getUser() from cookie
3. Fallback cookie checks: taj_staff_session, staff_user, staff_id
4. Unauthenticated -> redirect /staff/login?redirect=path
5. Login via loginStaff() Server Action -> supabase.auth.signInWithPassword() -> permission-based redirect
6. Every staff page.tsx calls verifyStaff() to re-validate session + load permissions from DB

### Role to Permission Mapping

| Role | Permissions |
|---|---|
| admin | ALL permissions (fetched dynamically) |
| waiter | view_orders, edit_orders, confirm_orders |
| kitchen | view_kitchen_queue, update_prep_status |
| cashier | view_billing, generate_bills, edit_menu, view_menu |

### Seed / Test Credentials (LOCAL DEV ONLY)

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

Fixed UUIDs: 00000000-0000-0000-0000-000000000001 (admin) through ...0004 and ...0011 through ...0014

---

## 7. Local Development Setup

### Starting the App

    npm install
    npx supabase start
    npx supabase db reset
    npm run dev

Active .env.local:

    NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
    NEXT_PUBLIC_SUPABASE_ANON_KEY=""
    SUPABASE_SERVICE_ROLE_KEY=""""
    NEXT_PUBLIC_SITE_URL=http://localhost:3000

### Local URLs

| Service | URL |
|---|---|
| Next.js app | http://localhost:3000 |
| Supabase Studio | http://localhost:54323 |
| Supabase API | http://localhost:54321 |
| Supabase DB | postgresql://postgres:postgres@localhost:54322/postgres |
| Inbucket (email) | http://localhost:54324 |
| Customer ordering | http://localhost:3000/MenuCard?table=uuid |
| Staff login | http://localhost:3000/staff/login |
| Admin dashboard | http://localhost:3000/staff/admin |
| Phone QR (WiFi) | http://192.168.29.46:3000 |

### CRITICAL Warnings
1. NEVER run npx supabase db reset on production
2. NEVER expose SUPABASE_SERVICE_ROLE_KEY to browser
3. NEVER import supabaseAdmin in a client component
4. DO NOT commit .env.local to version control
5. Cloud keys commented out in .env.local - verify before cloud ops
6. supabase db push pushes to cloud production - always confirm with user first

---

## 8. Coding Conventions

### Naming
- Components: PascalCase.tsx
- Hooks: use-kebab-case.ts
- Server Actions: camelCase.ts in actions/
- Types: colocate in types.ts inside feature folder

### Creating New Pages
1. Create src/app/route/page.tsx (Server Component by default)
2. Call verifyStaff() for staff routes; redirect if unauthorized
3. Add export const dynamic = force-dynamic for non-cached routes
4. Render a use client component for interactivity
5. Add loading.tsx and error.tsx alongside async pages (AGENTS.md requirement)

### Database Patterns

Server Components (read via RLS):
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from('table').select('*');
    if (error) throw new Error(error.message);

Server Actions (mutate, bypasses RLS):
    'use server';
    import { supabaseAdmin } from '../lib/supabaseAdmin';
    const { error } = await supabaseAdmin.from('table').insert({ ... });

Client Realtime:
    'use client';
    import { supabase } from '../lib/supabase';
    supabase.channel('name').on('postgres_changes', ...).subscribe();

### Established Patterns (Must Follow)
1. Staff mutations use supabaseAdmin (service role) in Server Actions
2. verifyStaff() at top of every staff page.tsx
3. revalidatePath('/staff/...') after every mutation
4. Coupon validation always server-side
5. Stock enforcement at DB level via trigger - no app-level guards
6. Cart: Zustand persist, localStorage key taj-ooty-ordering-storage
7. Idempotency key sent with every order submission
8. Activity logging to staff_activity_log for every significant staff action
9. has_permission() is single source of truth - no hardcoded role checks in RLS

---

## 9. Known Issues

1. manage_inventory permission may not exist in DB - verify in Studio before using.
2. waiterActions.ts has eslint-disable any - needs proper TypeScript types.
3. Dev routes present: debug-auth/, fix-admin2/, test-db/, seed-admin/ - delete before prod.
4. Contact form no submit handler - Visit.tsx shows fake sent state.
5. Hero video placeholder - needs real restaurant footage.
6. Gallery images are placeholder gradients - needs real food photos.
7. Swiggy/Zomato webhooks not activated - env vars not set.
8. QZ Tray requires desktop install to function.
9. No loading.tsx or error.tsx on most staff route segments - violates AGENTS.md.
10. Monolithic components too large: WaiterDash.tsx (~137KB), KitchenDash.tsx (~115KB), BillingCheckout.tsx (~45KB) - need extraction.
11. App not deployed to Vercel: DNS not configured, cloud Supabase disabled.
12. MenuBook.tsx uses static data from src/lib/data.ts not live DB.
13. proxy.ts purpose unclear - needs review.

---

## 10. Future Roadmap

1. Production Vercel Deployment: Point hoteltajooty.in DNS (GoDaddy) to Vercel.
2. Native Windows Desktop App (Tauri v2): Documented in NATIVE_WINDOWS_DESKTOP_EXE_V1.md. Output: Taj_POS_v1.0.0_Setup.exe.
3. Mobile Apps: android/ and ios/ stub dirs exist. Likely Capacitor or React Native.
4. SaaS Multi-tenant Layer: src/features/ordering is portable SaaS block.
5. Live Swiggy/Zomato Integration: Requires partner API credentials.
6. MenuBook.tsx Live DB: Replace static arrays with live Supabase queries.
7. Push Notifications: staff_notifications table ready; browser push planned.
8. Inventory Management Module: manage_inventory permission exists in plan; module not built yet.

---

## 11. Agent Rules (MANDATORY)

1. Read AGENTS.md at workspace root before writing any code.
2. Never use Pages Router APIs (getServerSideProps, getStaticProps, getInitialProps).
3. Never run npx supabase db reset unless explicitly instructed.
4. Never run npx supabase db push without explicit user confirmation.
5. Never expose SUPABASE_SERVICE_ROLE_KEY to client-side code.
6. Every new table must have RLS enabled + at least one policy using has_permission().
7. New migrations = new numbered file in supabase/migrations/. Never edit existing.
8. New permission keys must be seeded in seed.sql with ON CONFLICT DO NOTHING.
9. Never hardcode role names (admin, waiter, etc.) in RLS policies. Use has_permission().
10. Always use supabaseAdmin in Server Actions that mutate data.
11. Always call verifyStaff() at top of every page.tsx under /staff/.
12. Always call revalidatePath after data mutations.
13. No any types without justifying comment. Use unknown instead.
14. No console.log() in committed code.
15. No inline style={{}} in components. Use Tailwind CSS v4 only.
16. Framer Motion for purposeful animations only - no decorative use.
17. Check node_modules/next/dist/docs/ for any Next.js 16 API before writing it.
18. useCartStore (Zustand) is the ONLY client-side state store.
19. Never skip the idempotency key on order submissions.
20. Stock enforcement at DB level only - no application-level stock guards.
21. Seed data must use fixed deterministic UUIDs.
22. src/features/ordering must remain Taj-branding-free (generic SaaS module).
23. Remove dev/debug routes before production deployment.
24. Dashboard preferences stored in dashboard_preferences table, not localStorage.
25. When adding new permissions: (a) permissions table via migration, (b) role_permissions rows, (c) seed.sql with ON CONFLICT DO NOTHING, (d) relevant UI checks.
