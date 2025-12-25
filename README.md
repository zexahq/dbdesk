# dbdesk

**The cleanest database management tool you've been waiting for.**

A fast, intuitive, and privacy-focused desktop application for managing your databases. Built for developers who want a simple yet powerful interface without the bloat.

Currently supports **PostgreSQL** and **MySQL**, with more SQL databases coming soon—and NoSQL support on the roadmap.

## ✨ Features

- **🔒 Local-First Security** — Your data never leaves your machine. Connect to databases securely with connection info stored locally.
- **⌨️ Keyboard-First** — Designed for power users who prefer staying on the keyboard.
- **📑 Multi-Tab Interface** — Open dozens of tables and queries simultaneously.
- **📝 SQL Editor** — Write and execute queries with Monaco Editor (autocompletion coming soon).
- **🌗 Dark & Light Mode** — Switch themes to match your preference.
- **✏️ Inline Editing** — Edit data directly like a spreadsheet.
- **🚀 Quick Panel** — Fast navigation with `Ctrl+K`.
- **⚡ Blazing Fast** — Opens instantly, tables load in milliseconds.

## 📥 Installation

Download the latest installer for your platform from the [GitHub Releases](https://github.com/zexahq/dbdesk/releases) page.

### macOS

If you encounter issues with macOS Gatekeeper blocking the app (since it is not signed with an Apple developer certificate), you can bypass this by running the following command in your terminal after installation:

```bash
xattr -rd com.apple.quarantine /Applications/dbdesk.app
```

After running this command, you can launch the app.

### Linux

Download the `.AppImage` file from the releases page. Make it executable and run:

```bash
chmod +x dbdesk-*.AppImage
./dbdesk-*.AppImage
```

### Windows

Download and run the installer from the releases page. The installer will handle setup automatically.

## 🛠️ Tech Stack

- [Electron](https://www.electronjs.org/) — Cross-platform desktop app
- [React](https://react.dev/) — UI framework
- [TanStack Router](https://tanstack.com/router) — Type-safe routing
- [TanStack Query](https://tanstack.com/query) — Data fetching & caching
- [TanStack Table](https://tanstack.com/table) — Powerful table UI
- [Zustand](https://zustand.docs.pmnd.rs/) — State management
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) — Code editor
- [Tailwind CSS](https://tailwindcss.com/) — Styling

## 📦 Local Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/)

### Setup

```bash
# Clone the repository
git clone https://github.com/zexahq/dbdesk.git
cd dbdesk

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Build

```bash
# Windows
pnpm build:win

# macOS
pnpm build:mac

# Linux
pnpm build:linux
```

## Renderer API client (desktop vs web)

The renderer uses a unified client (`@renderer/api/client.ts`) that hides whether it talks to the app via Electron IPC (desktop) or via HTTP (web).

- Detection
  - If `window.dbdesk` is present the client uses the preload IPC bridge (desktop mode).
  - Otherwise the client falls back to HTTP calls to `/api/...` endpoints (web mode).
  - You can force desktop mode in dev with `VITE_FORCE_DESKTOP=true`.

- Environment variables
  - `VITE_API_BASE_URL` — base URL to prefix HTTP requests (defaults to `''`)
  - `VITE_FORCE_DESKTOP=true` — force desktop mode even if `window.dbdesk` is not present

- Implementation
  - Desktop mode → `window.dbdesk.*` → IPC → Electron main process → database adapters
  - Web mode → `fetch('/api/...')` → HTTP Node.js API server → database adapters

## Node.js API Server

See [docs/SERVER.md](docs/SERVER.md) for complete documentation on running the standalone HTTP server.

Quick start: `npm run dev:server` starts the server on `http://localhost:3000`.

When running the renderer in dev (`npm run dev`), the Vite dev server proxies requests starting with `/api` to `http://localhost:3000` (see `electron.vite.config.ts`), so ensure the server is running before starting the renderer.

## 🔗 Connect

Follow us on X: [@dbdesk](https://x.com/dbdesk)

## 📄 License

MIT
