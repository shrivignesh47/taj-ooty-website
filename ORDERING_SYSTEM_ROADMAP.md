# Taj Ooty - Ordering System Implementation Roadmap

This document outlines the architectural blueprint and modular step-by-step implementation plan for the custom Supabase QR-Code Ordering & Staff Management System for Hotel Taj Ooty.

---

## ✅ Phase 1: Foundation (COMPLETED)
- [x] Design DB Schema (11 Tables, RBAC logic, Order Lifecycle).
- [x] Apply Row Level Security (RLS) constraints for Public & Staff boundaries.
- [x] Install `@supabase/supabase-js`.
- [x] Configure Client/Server Supabase access (`supabase.ts` & `supabaseAdmin.ts`).
- [x] Map exact TypeScript Interfaces corresponding to Postgres types.

---

## 🚀 Phase 2: The Menu Data Layer (COMPLETED)
**Objective**: Transition the static application menu into a dynamic, database-driven catalog.

1. **Menu Seeding Module**
   - [x] Harvest existing hardcoded Taj Ooty menu arrays (Soup & Starters, Shawarma, etc.).
   - [x] Create a one-time server script (or SQL block) to bulk `INSERT` into `categories` and `menu_items`. (Executed directly via temporary Next Edge API route bypass)
2. **Data Access Object (DAO)**
   - [x] Create `src/features/ordering/api/getCatalog.ts` utilizing heavily cached Next.js Server fetches.
3. **Frontend Integration**
   - [ ] Refactor `MenuBook.tsx` and the Weather Popover to read directly from the live Supabase tables rather than static code arrays. *(Pending/Optional depending on SaaS migration state)*

---

## 📱 Phase 3: SaaS Customer Ordering Experience (COMPLETED)
**Objective**: A hyper-minimalist, sleek, and decoupled customer UI (built generically for SaaS scalability without hardcoded Taj-specific lock-ins).

1. **Customer Onboarding Gate**
   - [x] Build standard route: `src/app/MenuCard/page.tsx`
   - [x] Initial state: A pristine onboarding popup requiring **Name, Phone Number, and Table Number** (if not auto-filled by a table-specific QR URL).
2. **Minimalist Ordering & Global Cart**
   - [x] Post-onboarding: Proceeds to view the live Category/Menu layout.
   - [x] Customer configures their cart and clicks "Order", generating an unconfirmed `'pending'` submission tied to their Table/Details.
3. **Data Integrity**
   - [x] The ordering module is built purely inside `src/features/ordering` as an isolated generic SaaS block, preventing hardcoded styling/data bleed from the main hotel static site.

---

## 🔐 Phase 4: Staff Authentication & Infrastructure (COMPLETED)
**Objective**: Build the secure gateway preventing unauthorized access to the restaurant operations.

1. **Next.js & Supabase Auth Bridge**
   - [x] Upgrade Supabase client to support persistent Auth sessions using `@supabase/ssr` (or native cookie mechanics) for SSR-rendered dashboard protection.
2. **Auth Gateway**
   - [x] Build `src/app/staff/login/page.tsx` utilizing Magic Links or Email/Password.
3. **RBAC Security Middleware**
   - [x] Create a Next.js `middleware.ts` that intercepts `/staff/*` requests.
   - [x] Enforce database-level session checking: verify `auth.uid()` corresponds to an active generic `staff_users` row.

---

## 💻 Phase 5: The Real-Time SaaS OS (Dashboards) (COMPLETED)
**Objective**: An advanced, powerful hub for waiters, kitchen staff, and cashiers updating in real-time via Supabase Postgres subscriptions.

1. **Waiter Control Center** (`/staff/orders`)
   - [x] **Verification loop:** Waiters instantly catch new `'pending'` table orders on their dash. They manually verify the customer/table, accept the order (`'confirmed'`), which officially pipes it to the KDS.
2. **Kitchen Display System (KDS)** (`/staff/kitchen`)
   - [x] Actions: Monitor `'confirmed'` pipeline. Tap card to progress to `'preparing'`, tap again to push to `'ready'`.
3. **Billing & Cashier Stand** (`/staff/billing`)
   - [x] Actions: Waiters/Cashiers catch completed table sessions. Once the customer finishes, it is formally pushed to the billing dashboard for manual billing/payment processing, finalizing the `bills` row.
4. **Admin Settings** (`/staff/admin`)
   - [x] Staff mapping, KOT/Revenue charts, and dynamic QR Code generation per table. Controls whether manual table entry popup is allowed or strict-QR enforced.

---

*Status: Architecture Fully Completed and Checked In.*
