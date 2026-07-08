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
