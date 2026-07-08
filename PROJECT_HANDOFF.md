# Project Handoff: Hotel Taj Ooty — Website + Ordering System

## Context
Redesigning the website for Hotel Taj Ooty (multi-cuisine restaurant, Ooty,
Tamil Nadu, India, est. 1992). Old site: https://hoteltajooty.in/ (frontend
only, no backend, single physical menu card + waiters taking orders by
phone — messy, no digital system).

Domain is on GoDaddy (registrar only, no hosting). Plan: point DNS to
Vercel, no hosting purchase needed on GoDaddy.

## Two-phase plan
- **Task 1 (DONE):** Frontend redesign — marketing site only (Home, About,
  Gallery, Menu preview, Testimonials, Visit/Contact). No ordering logic yet.
- **Task 2 (NOT STARTED — this is what's next):** QR-based digital ordering
  system + role-based dashboards + admin panel. Described in full below.

## Tech stack (decided)
- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4,
  Framer Motion, lucide-react for icons
- **Backend/DB:** Supabase (Postgres + Auth + Realtime + Storage) — chosen
  specifically to avoid running/maintaining a separate Node/Express +
  Socket.io server. Supabase Realtime (Postgres change subscriptions)
  replaces the need for websockets code.
- **Hosting:** Vercel (frontend + API routes), Supabase free tier for
  backend. Target cost: $0/month at single-restaurant scale.
- **Excel export:** ExcelJS or SheetJS (xlsx) — not yet added.
- **Charts (admin analytics):** Recharts — not yet added.

## What exists right now (Task 1 output)
Next.js project, already scaffolded and verified (`npx tsc --noEmit` and
`npx eslint src` both pass clean). Structure:

```
src/
  app/
    layout.tsx      -- fonts (Fraunces display + Work Sans body via next/font/google), metadata
    page.tsx         -- assembles all sections
    globals.css      -- design tokens (see Design system below)
  components/
    Navbar.tsx        -- sticky, transparent->solid on scroll
    Hero.tsx           -- video bg (public/videos/hero.mp4, currently placeholder), animated headline
    About.tsx          -- Vision/Mission + wax-seal "Est. 1992" SVG badge (signature element)
    Gallery.tsx        -- 12 pinned "recipe card" tiles, placeholder gradient blocks (swap for real photos)
    MenuPreview.tsx     -- 21 real menu categories as tiles, links to /menu (not built yet)
    Testimonials.tsx    -- 7 real Google reviews, hardcoded
    Visit.tsx           -- Google Maps iframe embed, contact form (front-end only, no submit handler yet), address/phone, Swiggy/Zomato links
    Footer.tsx
  lib/
    data.ts           -- ALL content lives here: menuCategories[], testimonials[], galleryItems[], siteInfo{address,phone,mapsEmbed,instagram,facebook,swiggy,zomato}
public/
  images/README.txt   -- instructions for where to drop real photos
  videos/README.txt   -- instructions for hero.mp4
```

### Design system (must be preserved/extended, not replaced)
Defined in `src/app/globals.css` as CSS variables + Tailwind v4 `@theme inline`:
- Colors: `--color-cream: #F6EEDF`, `--color-cream-dim: #EFE3CC`,
  `--color-clay: #B5502E`, `--color-clay-dark: #8F3D22`,
  `--color-maroon: #4E1414`, `--color-maroon-deep: #350C0C`,
  `--color-gold: #C9974A`, `--color-gold-soft: #E4C88C`,
  `--color-charcoal: #241B15`, `--color-sage: #6E7A4F`
- Fonts: `--font-display` = Fraunces (headings, used with italic accents),
  `--font-body` = Work Sans (body/UI)
- Utility classes: `.eyebrow` (uppercase tracked label), `.torn-edge`
  (paper-tear mask for recipe cards), `.paper-grain` (subtle noise overlay)
- Respects `prefers-reduced-motion`, has visible `:focus-visible` outline

### Known gaps to fix/finish in Task 1 before Task 2
- No real hero video/photos yet — placeholders only, needs real assets
- Contact form has no submit handler (just shows a fake "sent" state)
- `/menu` route linked from MenuPreview doesn't exist yet — either build a
  static full-menu page OR skip straight to Task 2's live ordering menu

## Task 2 — full requirements (build this next)

### Customer flow (no login)
1. Each restaurant table gets a unique QR code → URL like
   `tajooty.com/order?table=12`
2. Scanning opens the live menu (not a PDF) with table number pre-filled
3. Customer browses by category, adds items to cart, enters **name + phone
   number**, places order
4. Order becomes read-only for the customer once placed — **cannot edit
   after submitting**, must ask the waiter to change it
5. Customer sees live order status: Placed → Confirmed → Preparing → Served

### Waiter flow (login required)
1. Waiter logs in, sees a live queue of incoming orders **for their
   assigned tables only**
2. Can **edit items/quantities** on a pending order, then **Confirm**
3. On confirm → order is routed simultaneously to Kitchen Display and
   Billing
4. Waiter dashboard also shows: orders taken today, active tables, history

### Kitchen (food prep) flow (login required)
- Live queue of **confirmed** orders only (not pending ones), with items,
  table number, notes
- Can mark items "preparing" → "ready"

### Cashier/Billing flow (login required)
- See confirmed/served orders per table, itemized bill, waiter name,
  customer name, total price
- Generate final bill, mark as paid

### Admin (super user) flow (login required)
- Full menu CRUD (items, categories, prices, images, availability toggle)
- **Custom role creation** — not fixed roles. Admin can create a new role
  (e.g. "Assistant Manager") and assign a specific set of permissions from
  a permissions list (e.g. can_view_orders, can_edit_menu, can_view_revenue,
  can_manage_users). This must NOT be hardcoded if/else role checks — model
  it as data (roles table + permissions table + role_permissions join
  table), enforced via Supabase Row Level Security (RLS) policies.
- Staff user management: create/deactivate waiter, cashier, kitchen,
  custom-role accounts
- Analytics dashboard: daily/monthly revenue, order volume, top items,
  table turnover (charts via Recharts)
- Excel export of orders/revenue/customer data (ExcelJS or SheetJS)

### Data model (target Postgres schema — not yet created)
```
users        (id, name, phone, auth_id [supabase auth], role_id)
roles        (id, name, is_custom boolean)
permissions  (id, key)              -- e.g. "view_orders", "edit_menu", "view_revenue"
role_permissions (role_id, permission_id)
tables       (id, table_no, qr_code_url, assigned_waiter_id)
categories   (id, name)              -- seed from src/lib/data.ts menuCategories
menu_items   (id, category_id, name, price, image_url, is_available)
orders       (id, table_id, customer_name, customer_phone, status, waiter_id, created_at)
order_items  (id, order_id, menu_item_id, qty, notes)
order_status_history (order_id, status, changed_by, timestamp)
bills        (id, order_id, total, waiter_id, cashier_id, paid_at)
```
`orders.status` enum: `pending -> confirmed -> preparing -> ready -> served -> billed`

### Menu seed data
Real category list (21 categories) already exists in `src/lib/data.ts` as
`menuCategories`. **Item names + prices are NOT yet digitized** — they
currently exist only as a physical printed menu card (photos/PDF still
need to be extracted; ask the project owner for that file if not already
provided). The old site's `/Menu` page (https://hoteltajooty.in/Menu) has
item names per category already as text (no prices) — can be scraped as a
starting point for item names, then prices filled in manually.

### Realtime requirements
Waiter, kitchen, and admin dashboards must update live (no manual refresh)
when order status changes — use Supabase Realtime Postgres change
subscriptions on the `orders` and `order_items` tables, not polling.

### Hosting/deploy target
- Vercel project, custom domain `hoteltajooty.in` (currently on GoDaddy —
  DNS needs to be pointed to Vercel: either A records to Vercel's IPs for
  the apex domain, or CNAME `cname.vercel-dns.com` for `www`)
- Supabase project not yet created — needs: Project URL, anon public key,
  service_role key (service_role must only be used server-side, never
  exposed to frontend/client bundle)

## Immediate next steps for you (the coding assistant continuing this)
1. Confirm the Task 1 frontend project runs (`npm install && npm run dev`)
2. Set up Supabase project + write the SQL migration for the schema above
   + RLS policies per role/permission
3. Build the customer ordering flow first (highest value, no auth needed)
4. Then waiter dashboard, then kitchen display, then billing, then admin
   panel with custom role builder + analytics + Excel export last
