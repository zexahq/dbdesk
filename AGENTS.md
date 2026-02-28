# DBDesk - Agent Guidelines

## Build/Test Commands

Always use `pnpm` (not npm or yarn) for all commands. This is a **Turborepo monorepo**.

### Root (all workspaces)
- **Build**: `pnpm run build` (turbo: builds all packages)
- **Dev**: `pnpm run dev` (turbo: starts all apps in dev)
- **Dev Desktop**: `pnpm run dev:desktop`
- **Dev Server**: `pnpm run dev:server`
- **Type Check**: `pnpm run typecheck`
- **Lint**: `pnpm run lint`
- **Format**: `pnpm run format`

### Desktop (`apps/desktop/`)
- **Build**: `pnpm run build` (typecheck + electron-vite build)
- **Dev**: `pnpm run dev` (electron-vite dev --noSandbox)
- **Type Check Node**: `pnpm run typecheck:node`
- **Type Check Web**: `pnpm run typecheck:web`

### Server (`apps/server/`)
- **Dev**: `pnpm run dev` (tsx watch)
- **Type Check**: `pnpm run typecheck`

## Code Style

- **Imports**: Use `@common/*`, `@renderer/*` path aliases; organize imports with prettier-plugin-organize-imports. Prefer `@renderer/` aliases for cross-feature imports; relative imports within the same feature module are fine.
- **Formatting**: Single quotes, no semicolons, 100 char width, no trailing commas (Prettier config)
- **Types**: Strict TypeScript, use `type` for object types, `interface` for extensible contracts
- **Naming**: PascalCase for components/classes, camelCase for functions/variables, kebab-case for files
- **Error Handling**: Use Result types, proper error boundaries in React components
- **React**: Use functional components, hooks, JSX runtime (no React imports needed)
- **UI Components**: Radix UI + Tailwind CSS, components in `apps/desktop/src/renderer/src/components/ui/`
- **State**: Zustand for global state, TanStack Query for server state, TanStack Form for forms

## Architecture

- **Monorepo**: Turborepo with pnpm workspaces
  - `apps/desktop/` — Electron desktop app
  - `apps/server/` — Hono API server
  - `packages/shared/` — Shared types, schemas & utilities
  - `packages/api-client/` — Type-safe Hono RPC client
  - `packages/tsconfig/` — Shared TypeScript configs
- **Desktop main process**: `apps/desktop/src/main/` — IPC handlers, adapters, auto-updater, auth manager, token store
- **Desktop preload**: `apps/desktop/src/preload/` — typed IPC bridge (`typedInvoke`), env config
- **Desktop renderer**: `apps/desktop/src/renderer/src/` — feature-based folder structure (see below)
- **Common types**: `apps/desktop/src/common/`
- Database adapters pattern in `apps/desktop/src/main/adapters/` with shared interfaces
- Path aliases: `@common/*` → `src/common/*`, `@renderer/*` → `src/renderer/src/*`

### Renderer Feature-Based Structure

```
src/renderer/src/
├── main.tsx                          # Entry point
├── routeTree.gen.ts                  # TanStack Router generated
├── routes/                           # File-based routes
│   ├── __root.tsx
│   ├── index.tsx
│   ├── auth.tsx
│   └── $connectionId.tsx
├── shared/                           # Cross-cutting, domain-agnostic
│   ├── api/                          # IPC proxy (client.ts), window API
│   ├── lib/                          # query-client, server-client, toast, utils
│   ├── hooks/                        # use-mobile, use-theme
│   └── stores/                       # app-store, theme-store
├── features/
│   ├── auth/                         # Auth components, lib, stores
│   ├── connections/                  # Connection CRUD, forms, queries
│   ├── sql-workspace/                # SQL workspace, tabs, query/table views
│   ├── data-table/                   # Data table, cell variants, export
│   └── editor/                       # Monaco editor, completion service
├── components/
│   ├── shell/                        # App shell: sidebar, titlebar, quick-panel
│   ├── dialogs/                      # Shared dialogs
│   └── ui/                           # Generic Radix primitives
├── assets/
└── styles/
```

### IPC Architecture
- Typed contract in `packages/shared/src/ipc/contract.ts` — defines all channels with Zod schemas
- Preload: `typedInvoke` / `typedHandle` wrappers for compile-time + runtime type safety
- Channels: adapter, auth, connection, query, schema, table, update, workspace, saved-query

### Auth Flow
- PKCE SHA-256 challenge generated in main process
- Tokens stored via Electron safeStorage (never transit renderer)
- Server-side code exchange at `/api/auth/desktop/*`

### Auto-Updates
- electron-updater via GitHub Releases
- `autoDownload: false` — user confirms download
- Events forwarded to renderer via `webContents.send`

### Environment Variables
- Build-time `define` in `electron.vite.config.ts` (no runtime dotenv)
- `__API_URL__` / `__WEB_URL__` embedded at build time for main + preload
- `.env` (dev defaults), `.env.production` (prod URLs)
