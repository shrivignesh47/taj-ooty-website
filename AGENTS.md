# Antigravity Agent Rules
> Read this file completely before writing, editing, or deleting any code.

---

## 🔴 CRITICAL — Read Before Any Next.js Code

This project's Next.js version may have **breaking changes** from your training data.

**Before writing any Next.js code:**
→ Open `node_modules/next/dist/docs/` and read the relevant section first.
→ If the doc contradicts your training, **the doc wins. Always.**

---

## 🧱 Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 — App Router only |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 |
| Database | Supabase (Postgres + Auth + Realtime + Storage) |
| Hosting | Vercel |

---

## 📁 File & Folder Conventions

```
src/
├── app/                  # App Router pages and layouts only
│   └── (group)/          # Route groups for role-based layouts
├── components/           # Shared, generic UI components
├── features/             # Self-contained feature modules
│   └── [feature]/
│       ├── components/
│       ├── hooks/
│       ├── types.ts
│       └── utils.ts
├── lib/                  # Supabase clients, helpers, constants
└── config/               # App-wide config (branding, settings)
```

**Naming:**
- Pages & Layouts: `page.tsx`, `layout.tsx` (Next.js convention)
- Components: `PascalCase.tsx`
- Hooks: `use-kebab-case.ts`
- Utils / Helpers: `kebab-case.ts`
- Types: colocate in `types.ts` inside the feature folder

---

## ⚙️ TypeScript Rules

- **Strict mode is ON** — no `any`, no `as` casts without a comment explaining why
- Always define prop types as `interface`, not inline
- Use `unknown` over `any` when type is genuinely unknown
- Export types from `types.ts` — never define them inline in component files

---

## 🗄️ Supabase Rules

| Context | Client to use |
|---|---|
| Server Components, Route Handlers, Server Actions | `createServerClient` from `@supabase/ssr` |
| Client Components | `createBrowserClient` from `@supabase/ssr` |

- **Never** expose `service_role` key outside server-side code
- **RLS is always ON** — every new table must have a policy. Never disable RLS.
- All schema changes go through **migration files** in `supabase/migrations/` — never edit the DB directly
- Seed data (users, roles, permissions) must use **fixed UUIDs** in `supabase/seed.sql` so `npx supabase db reset` is non-destructive

---

## ⚛️ Next.js App Router Rules

- Pages Router APIs are **forbidden**: no `getServerSideProps`, `getStaticProps`, `getInitialProps`
- Fetch data in **Server Components** by default — only use `"use client"` when strictly necessary (event handlers, browser APIs, hooks)
- Use **Server Actions** for form mutations — not API routes unless an external client needs them
- `loading.tsx` and `error.tsx` are required for every route segment that fetches data
- Never use `<form>` HTML tags — use `onClick` / `onChange` with Server Actions or handlers

---

## 🎨 UI & Styling Rules

- **Tailwind CSS v4 only** — no inline `style={{}}`, no CSS modules unless unavoidable
- Mobile-first: write base styles for mobile, add `md:` / `lg:` breakpoints for desktop
- No hardcoded color hex values in components — use Tailwind config tokens only
- Animations: use Framer Motion for intentional, purposeful transitions. No decorative animation for its own sake.
- Accessible by default: keyboard focus visible, ARIA labels on icon-only buttons, color contrast AA minimum

---

## 🚫 Forbidden Patterns

```ts
// ❌ Never do these:
localStorage.setItem(...)          // Use Supabase or React state
sessionStorage.getItem(...)        // Same as above
console.log(...)                   // Remove before committing; use proper error handling
const x: any = ...                 // Use proper types
<form onSubmit={...}>              // Use onClick + Server Actions instead
fetch('/api/...', { method: 'GET' })  // Prefer Server Components for reads
```

---

## ✅ Required Patterns

```ts
// ✅ Server Component data fetch
const supabase = createServerClient(...)
const { data, error } = await supabase.from('table').select('*')
if (error) throw new Error(error.message)

// ✅ Client Component with browser Supabase
'use client'
const supabase = createBrowserClient(...)

// ✅ Error boundary
// Every route with data must have error.tsx alongside page.tsx

// ✅ Loading state
// Every route with async data must have loading.tsx
```

---

## 🔐 Auth & Permissions

- Auth is handled by **Supabase Auth** — never roll a custom auth system
- Role and permission checks happen **server-side** — never trust client-side role state alone
- Use a `has_permission(user_id, permission_name)` pattern on the DB level for RLS
- Session must be refreshed server-side via middleware (`middleware.ts` at project root)

---

## 🏗️ Architecture Principles

1. **Feature-first structure** — each feature is self-contained under `src/features/[name]/`. It must be portable with no changes to other features.
2. **Config-driven, not hardcoded** — all environment-specific or client-specific values live in a config file. Components are generic.
3. **Server by default** — if it can be a Server Component, it is. `"use client"` is opt-in, not default.
4. **Fail loudly in dev, gracefully in prod** — throw errors during development; show user-friendly fallback UI in production.
5. **One source of truth** — types, constants, and config are defined once and imported everywhere. No duplication.

---

## 🔄 Git & Code Quality

- One concern per commit — don't mix feature work with refactors
- No commented-out dead code — delete it, Git has history
- Every function longer than 30 lines should be considered for extraction
- New utility functions go in `src/lib/` or the relevant feature's `utils.ts`

---

## 🧪 Before You Submit Any Code

Run through this checklist mentally:

- [ ] Did I read the Next.js docs for any App Router API I used?
- [ ] Are Server vs Client components correctly separated?
- [ ] Is RLS enabled on any new table I created?
- [ ] Did I use fixed UUIDs for any seeded data?
- [ ] Are there no `any` types or `console.log` statements?
- [ ] Does the component read config from the config file, not hardcoded values?
- [ ] Does every async route have `loading.tsx` and `error.tsx`?

---

> **When in doubt: read the local docs first, ask the user second, guess never.**