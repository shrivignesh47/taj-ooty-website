# Taj POS - Windows Billing Desktop Application

This folder contains the Tauri v2 desktop application layer for wrapping the Hotel Taj Ooty POS system into a native Windows `.exe` installer.

## Project Structure

```
windowsapplication_billing/
  src-tauri/                 ← Tauri Rust core configuration and source files
    src/
      main.rs                ← Entry point bootstrapped to lib
      lib.rs                 ← Builder setup and plugin registers
      commands.rs            ← Rust commands invoked by JavaScript frontend
    capabilities/
      default.json           ← App window permissions & capabilities configuration
    tauri.conf.json          ← Build properties & plugin configuration
    Cargo.toml               ← Rust crate dependencies
    build.rs                 ← Standard build script
  DOCUMENTATION.md           ← Complete stage-by-stage architecture document
  TAURI_BUILD_CHECKLIST.md   ← Build verification steps and tests
```

## Quick Start (Development)

1. Make sure node dependencies are installed:
   ```bash
   npm install
   ```
2. Start the desktop application in Tauri development mode:
   ```bash
   npm run tauri:dev
   ```

## Production Build

To compile a production build and generate the NSIS `.exe` installer setup file:
```bash
npm run tauri:build
```

The output setup file will be located at:
`windowsapplication_billing/src-tauri/target/release/bundle/nsis/Taj_POS_1.0.0_x64-setup.exe`
