# Architecture Documentation: Tauri v2 Windows Desktop App for Taj POS

This document provides a detailed breakdown of the Tauri v2 wrapper built for the Taj POS system. It details the architecture, bridge APIs, local storage management, and execution phases.

---

## 1. Architectural Overview

The Tauri v2 architecture isolates the native desktop wrapper in the `windowsapplication_billing/` folder, ensuring no leakage of Rust code or platform configs into the Next.js frontend code. The architecture is split into three layers:

1. **Frontend (SPA Next.js)**: Runs inside the OS webview (WebView2 on Windows). When `TAURI_BUILD` is enabled, Next.js compiles to static files via `output: 'export'`.
2. **IPC Bridge (tauriClient & supabaseTauri)**: Acts as a lightweight API bridge using `@tauri-apps/api/core` to call Rust commands and interact with Tauri plugins.
3. **Core (Tauri Rust)**: Compiles to native binary, handles window initialization, license storage encryption, system tray events, updater logic, and receipt printing.

```
┌─────────────────────────────────────────────────────────┐
│                 Next.js Frontend (SPA)                  │
└────────────────────────────┬────────────────────────────┘
                             │ IPC (invoke)
┌────────────────────────────▼────────────────────────────┐
│                    Tauri IPC Bridge                     │
└────────────────────────────┬────────────────────────────┘
                             │ Rust Commands
┌────────────────────────────▼────────────────────────────┐
│                  Tauri Rust Core (App)                  │
│  ┌─────────────────┐ ┌──────────────────┐ ┌──────────┐  │
│  │ Encrypted Store │ │ SQLite OfflineDB │ │ Printing │  │
│  └─────────────────┘ └──────────────────┘ └──────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Technical Features & Tauri Plugins

We utilize the following official Tauri v2 plugins:

- **Store (`tauri-plugin-store`)**: Stores business details and license keys securely in `tajpos.bin`.
- **Updater (`tauri-plugin-updater`)**: Listens to an update server endpoint and executes automatic silent/interactive downloads.
- **SQL (`tauri-plugin-sql`)**: SQLite integration (`sqlite:tajpos.db`) for storing offline orders and transactions when the network goes down.
- **FS & Dialog (`tauri-plugin-fs` & `tauri-plugin-dialog`)**: For locally importing/exporting catalog menu files and billing logs.

---

## 3. Data Integration & Supabase Client

Since Server Actions require a running Node.js server, they are unavailable in the static desktop export. Instead:
- In browser/Tauri mode, all requests bypass Server Actions and query the database directly via `supabaseTauri.ts` (using client-side REST commands).
- RLS policies configured in Supabase protect and authorize these client operations securely based on permissions.
- In normal web/server dev mode, the application continues to use standard cookie-based Server Actions.

---

## 4. Local Activation Lifecycle

1. **First-run check**: `lib.rs` checks if a `license_key` exists in `tajpos.bin`.
2. **Onboarding redirection**: If absent, the frontend redirects the user to the `/activate` route.
3. **Onboarding submit**: The user inputs the restaurant name, Supabase credentials, and license key.
4. **Key validation**: The bridge calls `validate_license` Rust command which stores the credentials in the encrypted store.
5. **Reload**: Once stored, the app reinitializes the Supabase client and redirects to `/staff/login`.
