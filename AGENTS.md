# DBDesk - Agent Guidelines

## Build/Test Commands

Always use `pnpm` (not npm or yarn) for all commands. This is a **Turborepo monorepo**.
(This covers monorepo development; end-user guidance such as `npm i -g dbdesk` is exempt.)

### Root (all workspaces)

- **Build**: `pnpm run build` (turbo: builds all packages)
- **Dev**: `pnpm run dev` (turbo: starts all apps in dev)
- **Dev Desktop**: `pnpm run dev:desktop`
- **Dev Server**: `pnpm run dev:server`
- **Type Check**: `pnpm run typecheck`
- **Lint**: `pnpm run lint`
- **Format**: `pnpm run format`
- **Clean Reinstall**: `rm -rf node_modules apps/*/node_modules packages/*/node_modules .turbo apps/*/.turbo packages/*/.turbo && pnpm install`

### Desktop (`apps/desktop/`)

- **Build**: `pnpm run build` (typecheck + electron-vite build)
- **Dev**: `pnpm run dev` (electron-vite dev --noSandbox)
- **Type Check Node**: `pnpm run typecheck:node`
- **Type Check Web**: `pnpm run typecheck:web`

### Server (`apps/server/`)

- **Dev**: `pnpm run dev` (tsx watch src/index.ts)
- **Type Check**: `pnpm run typecheck`
- **DB Push**: `pnpm run db:push` (push Drizzle schema to database)
- **DB Migrate**: `pnpm run db:migrate`
- **DB Generate**: `pnpm run db:generate`
- **DB Studio**: `pnpm run db:studio`

### Server Setup (first time)

1. Copy `apps/server/.env.example` → `apps/server/.env`
2. Set `DATABASE_URL` to your PostgreSQL connection string
3. Generate `BETTER_AUTH_SECRET` with `openssl rand -base64 32`
4. Run `cd apps/server && pnpm run db:push` to create tables

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
  - `apps/desktop/` — Electron desktop app (electron-vite 5, Electron 38)
  - `apps/server/` — Hono API server (@hono/node-server, port 3000)
  - `packages/shared/` — Shared types, Zod v4 schemas, IPC contract & utilities
  - `packages/api-client/` — Type-safe Hono RPC client (`hc<AppType>()`)
  - `packages/tsconfig/` — Shared TypeScript configs (base, node, react)
- Path aliases: `@common/*` → `src/common/*`, `@renderer/*` → `src/renderer/src/*`

### Desktop Main Process (`apps/desktop/src/main/`)

```
src/main/
├── index.ts                    # App entry, window creation, deep-link setup
├── connectionManager.ts        # Connection lifecycle management
├── storage.ts                  # Persistent storage
├── workspace-storage.ts        # Workspace state persistence
├── saved-queries-storage.ts    # Saved SQL queries persistence
├── adapters/                   # Database adapters (postgres, registry)
├── ipc/                        # Typed IPC handlers by domain
│   ├── index.ts                # registerAllIpcHandlers()
│   ├── typed-handle.ts         # typedHandle() with Zod validation
│   ├── adapter-handlers.ts
│   ├── auth-handlers.ts
│   ├── connection-handlers.ts
│   ├── query-handlers.ts
│   ├── saved-query-handlers.ts
│   ├── schema-handlers.ts
│   ├── table-handlers.ts
│   ├── update-handlers.ts
│   └── workspace-handlers.ts
├── lib/
│   ├── auth-manager.ts         # PKCE login flow, token refresh, session management
│   ├── auto-updater.ts         # electron-updater setup and event forwarding
│   ├── deep-link.ts            # dbdesk:// protocol handler, auth callback
│   ├── pkce.ts                 # PKCE SHA-256 challenge/verifier generation
│   ├── token-store.ts          # Electron safeStorage encrypted token persistence
│   ├── sql-parser.ts           # SQL parsing utilities
│   └── postgres/               # PostgreSQL-specific queries & utils
├── protocols/                  # Custom protocol handlers (asset server)
└── utils/                      # Error sanitization, validation helpers
```

### Desktop Preload (`apps/desktop/src/preload/`)

```
src/preload/
├── index.ts                    # contextBridge.exposeInMainWorld
├── typed-ipc.ts                # typedInvoke wrapper for IPC contract
├── dbdesk-api.ts               # Database operations API
├── window-api.ts               # Window control API
├── env-config.ts               # Build-time __API_URL__ / __WEB_URL__
└── index.d.ts                  # Type declarations for exposed APIs
```

### Desktop Renderer (`apps/desktop/src/renderer/src/`)

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
│   │   ├── components/               # auth-observer, deep-link-observer, user-menu
│   │   ├── lib/                      # auth.ts, auth-utils.ts
│   │   └── stores/                   # auth-store.ts
│   ├── connections/                  # Connection CRUD, forms, queries
│   │   ├── components/               # connection-card, connection-dialog, connection-list
│   │   │   └── connection-forms/     # PostgreSQL form components
│   │   └── queries/                  # connections.ts (TanStack Query hooks)
│   ├── sql-workspace/                # SQL workspace, tabs, query/table views
│   │   ├── components/               # sql-workspace, workspace-sidebar, workspace-topbar
│   │   │   ├── dialogs/              # create-table-dialog, etc.
│   │   │   ├── sheets/               # insert-row-sheet, etc.
│   │   │   ├── query-view/           # SQL query editor & results
│   │   │   └── table-view/           # Table data browser
│   │   ├── hooks/                    # use-tab-close-handler, use-workspace-tabs
│   │   ├── lib/                      # workspace.ts
│   │   ├── queries/                  # schemas.ts, table-data.ts
│   │   └── stores/                   # sql-workspace-store, tab-store, saved-queries-store
│   ├── data-table/                   # Data table, cell variants, export
│   │   ├── components/               # data-table, columns, cell-editor-sheet
│   │   │   └── data-table-cell-variants/  # Boolean, date, json, null, text, uuid
│   │   ├── hooks/                    # use-data-table.tsx
│   │   ├── lib/                      # data-table.ts, download.ts
│   │   ├── queries/                  # export.ts
│   │   └── types/                    # data-table.ts
│   └── editor/                       # Monaco editor, completion service
│       ├── components/               # basic-editor, sql-editor
│       └── monaco/                   # completion-service, workers
├── components/
│   ├── shell/                        # App shell: main-sidebar, titlebar, quick-panel, update-notification
│   ├── dialogs/                      # Shared dialogs (save-query-dialog)
│   └── ui/                           # 28 Radix UI primitives (button, dialog, input, etc.)
├── assets/
└── styles/
```

### Server (`apps/server/src/`)

```
src/
├── index.ts                    # App entry, Hono routes, @hono/node-server
├── auth.ts                     # better-auth config (email/password, social, bearer plugin)
├── db/
│   ├── index.ts                # Drizzle + pg Pool (reads DATABASE_URL)
│   └── schema.ts               # user, session, account, verification tables
├── middleware/
│   └── auth.ts                 # Auth middleware (session/user into context)
├── modules/
│   ├── auth/
│   │   ├── desktop-auth.router.ts    # PKCE code create + exchange endpoints
│   │   └── desktop-login.page.ts     # HTML login page for desktop auth flow
│   └── chat/
│       └── chat.router.ts            # AI chat endpoint
└── prompts/                    # AI prompt templates
```

### Shared Package (`packages/shared/src/`)

```
src/
├── index.ts                    # Re-exports everything
├── types/                      # TypeScript types (adapter, connection, sql, workspace, etc.)
├── schemas/                    # Zod v4 schemas (connection, query, table, workspace, ipc-payloads)
├── constants/                  # Database constants (postgres)
├── ipc/
│   └── contract.ts             # IPC contract: 36 typed channels with payload/result types
└── utils/                      # Shared utilities
```

### IPC Architecture

- Typed contract in `packages/shared/src/ipc/contract.ts` — defines all 36 channels with payload/result types
- Main process: `typedHandle()` in `apps/desktop/src/main/ipc/typed-handle.ts` — registers handlers with Zod validation per channel
- Preload: `typedInvoke()` in `apps/desktop/src/preload/typed-ipc.ts` — type-safe IPC bridge
- 9 domain handler files: adapter, auth, connection, query, saved-query, schema, table, update, workspace

### Auth Flow

1. Desktop calls `auth:get-login-url` → main process generates PKCE challenge, returns `WEB_URL/auth/desktop?code_challenge=...`
2. Browser opens login page (served by server at `/auth/desktop`) → user signs in via better-auth (email/password)
3. Login page calls `POST /api/auth/desktop/create-code` with the PKCE code_challenge → gets one-time auth code
4. Login page redirects to `dbdesk://auth?code=...` deep link
5. Desktop receives deep link → exchanges code + PKCE verifier via `POST /api/auth/desktop/exchange`
6. Server verifies PKCE (`SHA-256(verifier) == challenge`), creates bearer session, returns token
7. Token stored in Electron safeStorage (never transits renderer)

### Auto-Updates

- electron-updater via GitHub Releases (configured in `electron-builder.yml`)
- `autoDownload: false` — user confirms download via update-notification component
- Events forwarded to renderer via `webContents.send`: `update:available`, `update:downloaded`, `update:progress`, `update:error`
- Checks on startup (5s delay) then every 4 hours

### Environment Variables

#### Desktop (`apps/desktop/`)

- Build-time `define` in `electron.vite.config.ts` (no runtime dotenv in app)
- `__API_URL__` / `__WEB_URL__` embedded at build time for main + preload
- `.env` (dev defaults), `.env.production` (prod URLs)
- Workspace packages (`@dbdesk/shared`, `@dbdesk/api-client`) are bundled via `externalizeDeps.exclude`

#### Server (`apps/server/`)

- Runtime `dotenv/config` loaded at startup
- Required: `DATABASE_URL`, `BETTER_AUTH_SECRET`
- Optional: `PORT` (default 3000), `BETTER_AUTH_URL`, `WEB_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`

### E2E Type Safety

- Server exports `AppType` (Hono route types) from `apps/server/src/index.ts`
- `@dbdesk/api-client` creates typed client via `hc<AppType>()` from `hono/client`
- Desktop renderer uses the API client for server communication with full type inference

### CI/CD

- `.github/workflows/release.yml` — builds Linux, Windows, macOS on tag push (`v*`)
- Uses `electron-builder --publish always` with GitHub Releases
- `VITE_API_URL` / `VITE_WEB_URL` from repository variables
