# Hotel Taj Ooty — Website (Task 1: Frontend Redesign)

Modern, animated Next.js redesign of hoteltajooty.in — Home page with
Hero, About (Vision/Mission), Gallery, Menu preview, Testimonials, and
Visit/Contact sections. Built with Next.js 16 (App Router), Tailwind CSS v4,
and Framer Motion.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Add your real photos & video

- `public/videos/hero.mp4` — hero background video (short, muted, looping,
  under ~8MB works best for mobile).
- `public/images/hero-poster.jpg` — fallback image shown before the video
  loads.
- `public/images/gallery-*.jpg` — swap into `src/components/Gallery.tsx`
  (currently uses placeholder colour blocks styled as pinned recipe cards,
  so it already looks intentional even before you add photos).

## Content already wired in from the old site

- Vision & Mission text
- All 21 menu categories (Soups, Starters, Biriyani, Kuzhimandi, Beef, etc.)
- 7 real guest testimonials
- Address, phone, Google Maps embed, Instagram/Facebook, Swiggy/Zomato links

Edit any of this in `src/lib/data.ts` — one file, no need to touch the
components.

## Colour theme

Warm-earthy palette defined in `src/app/globals.css`:
clay (#B5502E), maroon (#4E1414), gold (#C9974A), cream (#F6EEDF).
Change these six variables to re-theme the entire site.

## Deploy

Push this folder to a GitHub repo, then import it in Vercel — zero config
needed, Next.js is auto-detected.

## What's next (Task 2)

The QR ordering system, waiter/kitchen/cashier dashboards, and admin panel
(custom roles, menu management, revenue analytics, Excel export) will be
built on top of this as a separate phase, using Supabase for the database,
auth, and realtime order updates.

## Online Aggregator Webhook Setup (Swiggy & Zomato)

To enable live production order receiving from Swiggy and Zomato directly into the POS:

1. **Partner Portal Registration**:
   - Register as an enterprise restaurant partner at the [Swiggy Partner Portal](https://partner.swiggy.com/) and [Zomato Partner Portal](https://www.zomato.com/merchant).
   - Request POS Integration credentials and webhook URL configuration.

2. **Configure Webhook Endpoints**:
   - Swiggy Webhook URL: `https://your-domain.com/api/webhooks/aggregators/swiggy`
   - Zomato Webhook URL: `https://your-domain.com/api/webhooks/aggregators/zomato`

3. **Environment Variables**:
   Add the partner signing secrets obtained from the partner portals to `.env.local` / `.env.production`:
   ```env
   SWIGGY_WEBHOOK_SECRET="your_swiggy_webhook_secret_here"
   ZOMATO_WEBHOOK_SECRET="your_zomato_webhook_secret_here"
   ```

*Note: For local testing and development without live partner credentials, use the built-in "Simulate Test Mode" buttons inside the POS Online Orders panel.*

## Direct ESC/POS Thermal Printer Setup (QZ Tray)

To enable silent, direct printing to USB or Network thermal receipt printers (80mm & 58mm) without browser print popups:

1. **Install QZ Tray Desktop Service**:
   - Download and install the free [QZ Tray App](https://qz.io/download/) on the POS billing computer.
   - Ensure QZ Tray is running in the background system tray.

2. **Configure Thermal Printer in Taj POS**:
   - In the POS Header, click the **"Printer"** setup button.
   - Select your connected thermal printer (e.g. `EPSON TM-T82`, `POS-80`, `TVS RP-3150`) from the auto-discovered list.
   - Click **"Send ESC/POS Test Print Ticket"** to test raw printing.
   - Save settings.

3. **Browser Fallback**:
   - If QZ Tray is not running or the thermal printer is disconnected, the system automatically falls back to standard browser printing (`window.print()`).


