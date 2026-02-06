<h1 align="center">
  <img
    src="https://github.com/user-attachments/assets/08b9db99-9e85-47a3-b72f-11616033cad6"
    alt="DBDesk banner"
    width="280"
  />
</h1>


**The cleanest database management tool you've been waiting for.**

A fast, intuitive, and UI/UX-focused desktop application for managing your databases. Built for developers who want a simple yet powerful interface without the bloat.

Currently supports **PostgreSQL** and **MySQL**, with more SQL databases coming soon—and NoSQL support on the roadmap.

<img width="3840" height="2090" alt="dbdesk" src="https://github.com/user-attachments/assets/73edba41-7fe7-499f-8327-5a22b36fbfe0" />

## ✨ What we got already

- **Local-First Security** — Your data never leaves your machine. Connect to databases securely with connection info stored locally.
- **Keyboard-First** — Designed for power users who prefer staying on the keyboard.
- **Multi-Tab Interface** — Open dozens of tables and queries simultaneously.
- **SQL Editor** — Write and execute queries with Monaco Editor.
- **Dark & Light Mode** — Switch themes to match your preference.
- **Inline Editing** — Edit data directly like a spreadsheet.
- **Quick Panel** — Fast navigation with `Ctrl+P`.
- **Blazing Fast** — Opens instantly, tables load in milliseconds.

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

## 🔗 Connect

Follow us on X: [@dbdesk](https://x.com/dbdesk)
