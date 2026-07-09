# Hotel Taj Ooty - System & Database Flow Architecture

This document tracks the complete end-to-end flow of the Hotel Taj Ooty restaurant management system, highlighting the user journeys and how the local Supabase PostgreSQL database handles the data.

---

## 1. Local Database Ecosystem (Supabase)

We are running a local Supabase instance that provides PostgreSQL, GoTrue (Authentication), and Realtime WebSocket tracking. 

### Core Database Tables
The core schema is structured around a few foundational pillars:

1. **Menu & Inventory**
   - **`menu_categories`**: Master list of categories (e.g., Starters, Main Course).
   - **`menu_items`**: Individual items with price, availability status, and type (veg/non-veg), linked to a category via `category_id`.
2. **Floor Management**
   - **`restaurant_tables`**: Stores table identifiers (e.g., Table 1, Table 2). Used to generate QR codes securely.
3. **Order Lifecycle**
   - **`orders`**: The central transactional table. Tracks overarching order status (`pending`, `confirmed`, `preparing`, `ready`, `served`, `billed`, `completed`). Links to a specific table, guest count, and customer identity (name/phone).
   - **`order_items`**: Line items mapped to an `order_id` and `menu_item_id`. Snapshots the `price_at_order` to prevent historical bill changes if menu prices are updated later.
4. **Auth & Staff Authorization (RBAC)**
   - Supabase native Auth tracks identities. 
   - **`roles`**, **`permissions`**, **`role_permissions`**: Maps many-to-many granular capabilities (e.g., `manage_orders`, `view_revenue`).
   - **`staff_users`**: Bridges the Supabase `auth.users` UUID (`auth_id`) to the application metadata (name, phone, role references).
5. **System Modules**
   - **`staff_activity_log`**: Audits staff actions (updates, deletions) with JSONB payload details to ensure traceability.
   - **`restaurant_settings`**: Global configuration (GSTIN, Service Charge %, Brand Name).

---

## 2. Customer Ordering Flow (Client-Side)

1. **Entry Point (QR Scan)**: The customer scans a QR code located on their physical table. The URL holds a secure table ID.
2. **Menu Browsing**: The frontend fetches live `menu_items` directly from Supabase. The customer interfaces with an anonymous cart stored in their local device state.
3. **Order Submission**: 
   - The user inputs their basic identity (Name, Phone number - required for CRM tracking).
   - The React frontend fires an insertion into the `orders` table. 
   - Following successful order creation, the UI iterates over the cart and inserts bulk rows into `order_items`.
4. **Live Tracking**: After placing the order, the customer stays on an "Order Status" page. This page subscribes to **Supabase Realtime**, listening to row updates on their specific `order_id`. If a staff member marks the order as 'preparing', the customer's phone updates instantly.

---

## 3. Staff & Role-Based Flow

The application restricts access via JWT-based auth tokens and redirects based on assigned roles.

1. **Login (`/staff/login`)**: Staff log in using an email and auto-generated password.
2. **Session Verification**: `fetchAdminStats.ts` and `auth.ts` decode the session and lookup the connected row in `staff_users` to retrieve their `role_permissions`.
3. **Role-based Redirection**:
   - **Waitstaff**: Redirected to `/staff/orders`. Sees pending orders to confirm/serve.
   - **Kitchen/Chef**: Redirected to `/staff/kitchen`. Sees confirmed orders and transitions them to `preparing` and `ready`.
   - **Cashier**: Redirected to `/staff/billing`. Consolidates fulfilled table orders and generates the final bill/receipt with GST calculations.
   - **Admin/Manager**: Redirected to `/staff/admin`.

---

## 4. Admin Dashboard Flow (The "Brain")

The Admin Dashboard enforces a unified data consumption model designed for extreme speed and comprehensive oversight:

### 4.1 Server-Side Aggregation (`fetchAdminStats.ts`)
Instead of making 10 different database calls from the client, the Next.js Server Action utilizes the `SUPABASE_SERVICE_ROLE_KEY`. 
- This bypasses standard RLS processing and executes a massive parallel Promise (`Promise.all()`) against Tables, Orders, Staff, Menu, and Roles.
- The payload aggregates metrics like Revenue, Active Orders, Table Statuses, and CRM Visit Frequency natively on the backend before sending it to the client.

### 4.2 Dynamic Frontend Constraints (`AdminDash.tsx`)
- The client receives the massive dataset and the active user's permissions array.
- The `SidebarTabs` dynamically filter out routes the active staff member lacks permission to access.
- Operations:
  - **Menu Management**: Triggers `adminActions.ts` for batch updates (via XLSX) overriding existing items.
  - **CRM**: Traverses the `orders` table dynamically calculating Lifetime Value (LTV) per phone number.
  - **Exporting**: Bundles the aggregated datasets into an `.xlsx` utilizing the `xlsx` library and downloads it straight from the browser.

---

## 5. Security Posture

1. **Supabase RLS**: Baseline tables contain RLS policies protecting generic anon access.
2. **Server Actions vs Client Code**: Aggressive mutations (like `bulkAddMenuItems` or `addStaffUser`) are executed strictly on the backend (`use server` functions), preventing manipulated parameters from unauthorized browsers. 
3. **Action Auditing**: Destructive operations dispatch a secondary asynchronous write to the `staff_activity_log`, enforcing an unalterable history of *who* did *what*.
