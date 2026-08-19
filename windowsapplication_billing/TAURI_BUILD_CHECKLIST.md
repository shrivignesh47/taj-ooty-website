# Tauri Build Checklist

Follow this checklist to verify build correctness and validate the Tauri v2 desktop application.

## Prerequisites

- [ ] Node.js v20+ is installed.
- [ ] Rust and cargo are installed (`rustc --version`).
- [ ] WiX Toolset v3 or NSIS (Nullsoft Scriptable Install System) is installed for producing installers.
- [ ] Local Supabase Docker environment is running or credentials are ready.

## Local Next.js Static Export Verification

Before compiling Tauri, ensure the Next.js static export succeeds without errors:

- [ ] Execute `npm run build:tauri`.
- [ ] Verify that the `out/` folder is successfully created at the project root.
- [ ] Spot-check `out/index.html` and `out/activate/index.html` files.

## Tauri Development Mode Verification

- [ ] Run `npm run tauri:dev`.
- [ ] Confirm the Tauri app window launches and renders the main client menu page.
- [ ] Open DevTools (`Ctrl+Shift+I` or right-click inspect) to check for frontend errors.
- [ ] Verify that offline database plugin and key-value store plugins load without warnings.

## Production Compilation Verification

- [ ] Execute `npm run tauri:build`.
- [ ] Confirm that `Taj_POS_1.0.0_x64-setup.exe` is created in `windowsapplication_billing/src-tauri/target/release/bundle/nsis/`.
- [ ] Run the setup installer and verify the app installs successfully.
- [ ] Run the installed application and perform a full lifecycle order validation check.
