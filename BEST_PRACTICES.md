# DBDesk — Architecture & Best Practices Guide

> A comprehensive plan for restructuring DBDesk into a Turborepo monorepo with end-to-end type safety, proper auth, auto-updates, and clean env handling.

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Turborepo Monorepo Structure](#2-turborepo-monorepo-structure)
3. [End-to-End Type Safety — Hono RPC vs tRPC vs oRPC](#3-end-to-end-type-safety--hono-rpc-vs-trpc-vs-orpc)
4. [Clean & Organized Code](#4-clean--organized-code)
5. [IPC Type Safety (Electron Internal)](#5-ipc-type-safety-electron-internal)
6. [Auto-Updates — Download Once, Update Forever](#6-auto-updates--download-once-update-forever)
7. [Environment Variables in Builds](#7-environment-variables-in-builds)
8. [Authentication — Cookies, Tokens & Desktop Auth Flow](#8-authentication--cookies-tokens--desktop-auth-flow)
9. [Implementation Roadmap](#9-implementation-roadmap)

---

## 1. Current State Analysis

### What's Working Well

- **Adapter pattern** — Clean registry-based database adapter system (`AdapterRegistry` singleton, factory pattern)
- **Connection management** — Well-structured `ConnectionManager` with proper lifecycle
- **Type system** — Good discriminated unions for `ConnectionProfile`, `DBAdapter`, etc.
- **Preload isolation** — Proper use of `contextBridge` to expose APIs safely
- **Validation** — Input validation at both the preload and IPC handler layers

### Current Pain Points

| Problem | Where | Impact |
|---------|-------|--------|
| **Triple type duplication** | `dbdesk-api.ts` → `client.ts` → `ipc-handlers.ts` — every method signature is repeated 3 times | Every API change requires 3 synchronized edits |
| **String-based IPC channels** | `ipcRenderer.invoke('connections:list')` — no compile-time safety | Typo = runtime crash, no autocomplete |
| **Manual validation boilerplate** | Each IPC handler and preload method manually checks `typeof x !== 'string'` | ~200 lines of repeated validation code |
| **ENV via dotenv in preload** | `config()` from dotenv in `env-config.ts` — fragile, `.env` file must be co-located | Breaks in production builds, secrets leak risk |
| **XOR "encryption" for challenge** | `challenge-api.ts` uses XOR cipher with a static secret | Not cryptographically secure |
| **No auto-update config** | `dev-app-update.yml` points to a placeholder URL | Users must re-download manually |
| **No shared package** between desktop and backend | Types are inlined in both codebases | Drift between server and client types |

---

## 2. Turborepo Monorepo Structure

### Recommended Structure

```
dbdesk/
├── turbo.json
├── package.json                  # Root workspace config
├── pnpm-workspace.yaml
│
├── apps/
│   ├── desktop/                  # Electron app (current dbdesk)
│   │   ├── package.json
│   │   ├── electron-builder.yml
│   │   ├── electron.vite.config.ts
│   │   ├── tsconfig.json
│   │   ├── tsconfig.node.json
│   │   ├── tsconfig.web.json
│   │   └── src/
│   │       ├── main/
│   │       ├── preload/
│   │       └── renderer/
│   │
│   └── server/                   # Hono backend (current dbdesk-server)
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── routes/
│           └── lib/
│
└── packages/
    ├── shared/                   # Shared types, schemas, constants
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       ├── types/            # All shared types
    │       ├── schemas/          # Zod schemas (shared validation)
    │       └── constants/        # Shared constants
    │
    ├── api-client/               # Generated/typed API client
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       └── index.ts          # Hono RPC client export
    │
    ├── ui/                       # (Optional) Shared UI components if web app comes later
    │   └── ...
    │
    └── tsconfig/                 # Shared tsconfig presets
        ├── base.json
        ├── node.json
        └── react.json
```

### Root Configuration

**`pnpm-workspace.yaml`**:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**`turbo.json`**:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "out/**"]
    },
    "dev": {
      "dependsOn": ["^build"],
      "persistent": true,
      "cache": false
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "lint": {
      "dependsOn": ["^build"]
    }
  }
}
```

### Why This Structure?

- `packages/shared` is the **single source of truth** for types used by both `apps/desktop` and `apps/server`
- `packages/api-client` exports a typed Hono RPC client that the desktop renderer consumes
- Turborepo handles build ordering: `shared` → `api-client` → `desktop`/`server`
- Each package uses internal `tsconfig` presets for consistency
- `pnpm` workspaces give you fast installs and strict dependency isolation

### Package Internal Exports

Each package under `packages/` should use the `exports` field in `package.json` and be marked `"private": true` (internal packages):

```json
{
  "name": "@dbdesk/shared",
  "private": true,
  "exports": {
    ".": "./src/index.ts",
    "./types": "./src/types/index.ts",
    "./schemas": "./src/schemas/index.ts"
  },
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  }
}
```

> **Tip**: Use `"exports": { ".": "./src/index.ts" }` with TypeScript's `"moduleResolution": "bundler"` so Turborepo and Vite can import source `.ts` files directly — no build step needed for internal packages during development.

---

## 3. End-to-End Type Safety — Hono RPC vs tRPC vs oRPC

### The Options

| Feature | **Hono RPC** (Recommended) | **tRPC** | **oRPC** |
|---------|---------------------------|----------|----------|
| **Works with Hono?** | Native — built-in | Needs adapter | Needs adapter |
| **Bundle size** | Zero extra (part of Hono) | ~15KB | ~8KB |
| **Learning curve** | Minimal if you already use Hono | Moderate | Low |
| **Type inference** | Full e2e via `hc<AppType>()` | Full e2e | Full e2e |
| **File uploads** | Native | Plugin needed | Built-in |
| **Middleware** | Hono middleware | tRPC middleware | oRPC middleware |
| **Community** | Growing fast | Large & mature | Small & new |
| **REST compatible** | Yes — real HTTP routes | No — custom protocol | Yes |
| **OpenAPI** | Via `@hono/zod-openapi` | Via plugin | Built-in |

### Recommendation: **Hono RPC**

Since your backend is already Hono, using Hono's built-in RPC client is the cleanest path. You get end-to-end type safety without adding another framework layer.

### How Hono RPC Works

**Server side** (`apps/server`):

```typescript
// src/routes/connections.ts
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { createConnectionSchema, connectionResponseSchema } from '@dbdesk/shared/schemas'

const app = new Hono()
  .get('/connections', async (c) => {
    const connections = await db.listConnections()
    return c.json(connections)
  })
  .post(
    '/connections',
    zValidator('json', createConnectionSchema),
    async (c) => {
      const body = c.req.valid('json')
      const connection = await db.createConnection(body)
      return c.json(connection)
    }
  )
  .get(
    '/connections/:id',
    zValidator('param', z.object({ id: z.string().uuid() })),
    async (c) => {
      const { id } = c.req.valid('param')
      const connection = await db.getConnection(id)
      return c.json(connection)
    }
  )

export type ConnectionRoutes = typeof app
export default app
```

**Server entry** (`apps/server/src/index.ts`):

```typescript
import { Hono } from 'hono'
import connections from './routes/connections'
import auth from './routes/auth'

const app = new Hono()
  .basePath('/api')
  .route('/v1', connections)
  .route('/auth', auth)

export type AppType = typeof app
export default app
```

**Client package** (`packages/api-client`):

```typescript
import { hc } from 'hono/client'
import type { AppType } from '@dbdesk/server' // or import the type via shared

export function createApiClient(baseUrl: string, token?: string) {
  return hc<AppType>(baseUrl, {
    headers: () => ({
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'x-desktop': 'true'
    })
  })
}

export type ApiClient = ReturnType<typeof createApiClient>
```

**Desktop renderer usage**:

```typescript
import { createApiClient } from '@dbdesk/api-client'

const api = createApiClient(window.env.API_URL, bearerToken.get())

// Fully typed — autocomplete for routes, params, body, and response
const connections = await api.v1.connections.$get()
const data = await connections.json() // typed as ConnectionProfile[]

const newConn = await api.v1.connections.$post({
  json: { name: 'My DB', type: 'postgres', options: { ... } }
})
```

### Why Not tRPC?

- You'd have to wrap your Hono routes in a tRPC adapter, which adds complexity
- tRPC uses a custom RPC protocol — not standard REST
- You lose Hono's native middleware, validator, and routing benefits
- Two routing systems fighting each other

### Why Not oRPC?

- oRPC is newer and promising, but smaller community and ecosystem
- Would still require replacing your Hono router setup
- Good option if you're starting from scratch, but not when you already have Hono

### Shared Zod Schemas (`packages/shared`)

The key to type safety is defining Zod schemas once and using them everywhere:

```typescript
// packages/shared/src/schemas/connection.ts
import { z } from 'zod'

export const sqlConnectionOptionsSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().positive(),
  database: z.string().min(1),
  user: z.string().min(1),
  password: z.string(),
  ssl: z.boolean().optional()
})

export const databaseTypeSchema = z.enum(['postgres', 'mysql', 'mongodb', 'redis'])

export const createConnectionSchema = z.object({
  name: z.string().min(1).max(255),
  type: databaseTypeSchema,
  options: sqlConnectionOptionsSchema // use discriminated union for all types
})

export const connectionProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: databaseTypeSchema,
  options: sqlConnectionOptionsSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  lastConnectedAt: z.coerce.date().optional()
})

// Derive TypeScript types from schemas
export type CreateConnectionInput = z.infer<typeof createConnectionSchema>
export type ConnectionProfile = z.infer<typeof connectionProfileSchema>
```

This gives you:
- **Server**: Zod validation via `zValidator`
- **Client**: Type inference via Hono RPC
- **Desktop IPC**: Same schemas for preload validation
- **One source of truth** — change the schema, everything updates

---

## 4. Clean & Organized Code

### Current Problems

1. **Triple function repetition** — every API method exists in 3 places:
   - `src/main/ipc-handlers.ts` — handler
   - `src/preload/dbdesk-api.ts` — preload bridge (649 lines of boilerplate)
   - `src/renderer/src/api/client.ts` — renderer wrapper (229 lines mirroring preload)

2. **Inconsistent validation** — some handlers use centralized validators (`validateQueryInput`), others inline validation

3. **Giant single files** — `ipc-handlers.ts` is 544 lines registering all handlers in one function

### Recommended Approach

#### a) Split IPC Handlers by Domain

```
src/main/ipc/
├── index.ts                    # registerAllHandlers()
├── safe-handle.ts              # safeHandle utility
├── connection-handlers.ts      # connections CRUD
├── schema-handlers.ts          # schema/table listing
├── table-handlers.ts           # table operations
├── query-handlers.ts           # query execution
├── workspace-handlers.ts       # workspace persistence
└── saved-query-handlers.ts     # saved queries CRUD
```

Each file:
```typescript
// src/main/ipc/connection-handlers.ts
import { safeHandle } from './safe-handle'
import { createConnectionSchema } from '@dbdesk/shared/schemas'

export function registerConnectionHandlers() {
  safeHandle('connections:list', async () => loadProfiles())

  safeHandle('connections:create', async (payload) => {
    const data = createConnectionSchema.parse(payload) // Zod validation
    // ...
  })
}
```

#### b) Eliminate the Preload-to-Renderer Duplication

The current architecture has `dbdesk-api.ts` (preload) and `client.ts` (renderer) doing the same thing. The renderer client literally calls the preload method which calls IPC.

**Better approach — Typed IPC contract**:

```typescript
// packages/shared/src/ipc-contract.ts
import type { ConnectionProfile, QueryResult, ... } from './types'

export interface IpcContract {
  'connections:list': { payload: void; result: ConnectionProfile[] }
  'connections:get': { payload: { connectionId: string }; result: ConnectionProfile | undefined }
  'connections:create': { payload: CreateConnectionInput; result: ConnectionProfile }
  'query:run': { payload: { connectionId: string; query: string; limit?: number; offset?: number }; result: QueryResult }
  // ...all channels defined here once
}
```

Then generate both ends from this contract:

```typescript
// src/preload/typed-ipc.ts
import { ipcRenderer } from 'electron'
import type { IpcContract } from '@dbdesk/shared/ipc-contract'

type TypedInvoke = <K extends keyof IpcContract>(
  channel: K,
  ...args: IpcContract[K]['payload'] extends void ? [] : [IpcContract[K]['payload']]
) => Promise<IpcContract[K]['result']>

export const typedInvoke: TypedInvoke = (channel, ...args) =>
  ipcRenderer.invoke(channel, ...args)
```

```typescript
// src/preload/dbdesk-api.ts — drastically simplified
import { typedInvoke } from './typed-ipc'

export const dbdeskAPI = {
  listConnections: () => typedInvoke('connections:list'),
  getConnection: (connectionId: string) => typedInvoke('connections:get', { connectionId }),
  createConnection: (input) => typedInvoke('connections:create', input),
  // ... one-liners instead of 20-line methods
}
```

This pattern eliminates ~500 lines of boilerplate across preload and renderer client.

#### c) Use Zod Instead of Manual Validation

Replace all the manual `typeof` checks with Zod schemas from `@dbdesk/shared`:

```typescript
// Before (repeated everywhere)
if (!connectionId || typeof connectionId !== 'string' || connectionId.trim() === '') {
  throw new Error('Connection ID is required')
}

// After
const { connectionId } = connectionIdSchema.parse(payload) // throws ZodError with details
```

#### d) Co-locate Related Code

```
src/renderer/src/
├── features/
│   ├── connections/
│   │   ├── components/          # Connection-specific UI
│   │   ├── hooks/               # useConnections, useConnection
│   │   └── queries.ts           # TanStack Query hooks
│   ├── editor/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── queries.ts
│   └── tables/
│       ├── components/
│       ├── hooks/
│       └── queries.ts
├── components/
│   └── ui/                      # Shared UI primitives (keep as-is)
├── lib/                         # Shared utilities
└── store/                       # Global stores
```

---

## 5. IPC Type Safety (Electron Internal)

Beyond the IPC contract above, consider using [**electron-trpc**](https://github.com/jsonnull/electron-trpc) or a lightweight typed-IPC wrapper:

### Option A: Typed IPC Contract (Recommended — Zero Dependencies)

The contract approach shown in Section 4b gives you:
- **Compile-time channel name checking** — typos caught at build time
- **Payload and return type inference** — full autocomplete
- **Single source of truth** — the contract defines both sides

### Option B: electron-trpc

If you want a more structured approach, `electron-trpc` gives you tRPC over IPC:

```typescript
// Main process
const router = t.router({
  listConnections: t.procedure.query(async () => loadProfiles()),
  createConnection: t.procedure
    .input(createConnectionSchema)
    .mutation(async ({ input }) => { ... }),
})

// Renderer
const { data } = trpc.listConnections.useQuery()
```

**Recommendation**: Start with the typed IPC contract (Option A). It's simpler, has no dependencies, and fits your existing architecture. If you find yourself needing subscriptions or complex middleware on the IPC layer, then consider electron-trpc.

---

## 6. Auto-Updates — Download Once, Update Forever

### Current State

- `electron-updater` is installed but only `dev-app-update.yml` exists with a placeholder URL
- No publish config in `electron-builder.yml`
- No update check logic in the main process

### Setting Up Auto-Updates

#### a) Choose a Distribution Strategy

| Strategy | Pros | Cons |
|----------|------|------|
| **GitHub Releases** | Free, simple, built-in to electron-builder | Public repos only (for free) |
| **S3/R2/CloudFlare** | Private, cheap, fast CDN | More setup |
| **Your own server** | Full control | Must host update files yourself |

**Recommended: GitHub Releases** (simplest for most projects)

#### b) Configure `electron-builder.yml`

```yaml
# Add to electron-builder.yml
publish:
  provider: github
  owner: your-github-org
  repo: dbdesk
  releaseType: release

# Or for S3/R2:
# publish:
#   provider: s3
#   bucket: dbdesk-releases
#   region: us-east-1

mac:
  # ... existing config
  notarize: true                    # Required for macOS auto-updates
  target:
    - target: dmg
      arch: [universal]
    - target: zip                   # zip is REQUIRED for macOS auto-update
      arch: [universal]
```

> **Critical**: macOS auto-updates require a `.zip` target AND code signing + notarization. Without notarization, Gatekeeper blocks the update.

#### c) Implement Update Logic in Main Process

```typescript
// src/main/lib/auto-updater.ts
import { autoUpdater } from 'electron-updater'
import { BrowserWindow } from 'electron'
import log from 'electron-log'

export function setupAutoUpdater(): void {
  // Configure logging
  autoUpdater.logger = log
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  // Check for updates on startup (with delay to not block launch)
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify()
  }, 10_000)

  // Check periodically (every 4 hours)
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify()
  }, 4 * 60 * 60 * 1000)

  // Notify renderer about update events
  autoUpdater.on('update-available', (info) => {
    sendToRenderer('update:available', {
      version: info.version,
      releaseNotes: info.releaseNotes
    })
  })

  autoUpdater.on('download-progress', (progress) => {
    sendToRenderer('update:progress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    sendToRenderer('update:downloaded', { version: info.version })
  })

  autoUpdater.on('error', (error) => {
    log.error('Auto-update error:', error)
  })
}

function sendToRenderer(channel: string, data: unknown): void {
  const windows = BrowserWindow.getAllWindows()
  windows.forEach((window) => {
    window.webContents.send(channel, data)
  })
}
```

```typescript
// In src/main/index.ts — add to app.whenReady()
import { setupAutoUpdater } from './lib/auto-updater'

app.whenReady().then(() => {
  // ... existing setup
  setupAutoUpdater()
})
```

#### d) In-App Update UI

Add an IPC handler so the user can trigger install:

```typescript
ipcMain.handle('update:install', () => {
  autoUpdater.quitAndInstall(false, true) // isSilent=false, isForceRunAfter=true
})
```

Show a toast or banner in the renderer when an update is downloaded:

```typescript
// Renderer — listen for update events
window.dbdesk.onUpdateDownloaded((version) => {
  toast('Update Ready', {
    description: `Version ${version} is ready. Restart to apply.`,
    action: {
      label: 'Restart',
      onClick: () => window.dbdesk.installUpdate()
    }
  })
})
```

#### e) CI/CD Publishing

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    tags: ['v*']

jobs:
  build:
    strategy:
      matrix:
        os: [macos-latest, ubuntu-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm run build
      - name: Publish
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # For macOS notarization:
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
        run: pnpm exec electron-builder --publish always
```

### Update Flow Summary

```
App Launch → Check for updates (background)
                ↓
         Update available? → Download silently
                               ↓
                          Download complete → Show toast notification
                                               ↓
                                          User clicks "Restart" → quitAndInstall()
                                               OR
                                          Next app quit → Auto-install on restart
```

---

## 7. Environment Variables in Builds

### Current Problems

1. **`dotenv` in preload** — `config()` from dotenv reads `.env` at runtime, which doesn't exist in production builds
2. **`VITE_` prefix** — env vars prefixed with `VITE_` are meant for Vite's `import.meta.env`, not `process.env` in Node
3. **Hardcoded fallbacks** — `process.env.VITE_API_URL || 'http://localhost:9876'` makes it hard to track what's dev vs prod

### Correct Approach

Electron has **three different processes**, each needs env vars handled differently:

| Process | Runs In | How to Get Env |
|---------|---------|----------------|
| **Main** | Node.js | `process.env` — real Node env, or embed at build time |
| **Preload** | Node.js (sandboxed) | Same as main — `process.env` works |
| **Renderer** | Chromium (browser) | **Cannot use `process.env`** — must be injected |

### Recommended Setup

#### a) Define Env at Build Time via `electron-vite`

```typescript
// electron.vite.config.ts
import { defineConfig } from 'electron-vite'

export default defineConfig(({ mode }) => {
  // Load .env files based on mode
  // electron-vite automatically loads .env and .env.[mode]

  return {
    main: {
      define: {
        'process.env.API_URL': JSON.stringify(process.env.API_URL || 'http://localhost:9876'),
        'process.env.WEB_URL': JSON.stringify(process.env.WEB_URL || 'http://localhost:3000'),
        'process.env.NODE_ENV': JSON.stringify(mode)
      }
    },
    preload: {
      define: {
        'process.env.API_URL': JSON.stringify(process.env.API_URL || 'http://localhost:9876'),
        'process.env.WEB_URL': JSON.stringify(process.env.WEB_URL || 'http://localhost:3000')
      }
    },
    renderer: {
      // Renderer uses VITE_ prefix automatically via import.meta.env
      // Define VITE_API_URL in .env.production
    }
  }
})
```

#### b) Use `.env` files Properly

```
.env                    # Shared defaults (committed)
.env.local              # Local overrides (gitignored)
.env.production         # Production values (committed or via CI)
```

`.env`:
```
API_URL=http://localhost:9876
WEB_URL=http://localhost:3000
```

`.env.production`:
```
API_URL=https://api.dbdesk.app
WEB_URL=https://dbdesk.app
```

#### c) Remove `dotenv` from Preload

```typescript
// src/preload/env-config.ts — AFTER
// No more dotenv import — values are embedded at build time

export const envConfig = {
  API_URL: process.env.API_URL!,     // Defined at build time via electron-vite
  WEB_URL: process.env.WEB_URL!      // Defined at build time via electron-vite
}
```

#### d) For Secrets (Challenge Key)

Never embed secrets in the build. Instead:
- Generate the challenge secret dynamically at app startup
- Or use `safeStorage` from Electron to encrypt/store secrets locally
- Or derive it from a server-side exchange

```typescript
import { safeStorage } from 'electron'

// Generate once and store encrypted
function getOrCreateSecret(): string {
  const stored = store.get('challengeSecret') // electron-store or custom storage
  if (stored && safeStorage.isEncryptionAvailable()) {
    return safeStorage.decryptString(Buffer.from(stored, 'base64'))
  }

  const secret = crypto.randomBytes(32).toString('hex')
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(secret)
    store.set('challengeSecret', encrypted.toString('base64'))
  }
  return secret
}
```

---

## 8. Authentication — Cookies, Tokens & Desktop Auth Flow

### The Desktop Auth Problem

Desktop apps (Electron) can't use cookies the same way browsers do because:
1. The renderer runs in a Chromium instance with a different origin than your server
2. `httpOnly` cookies set by the server won't be accessible or sent automatically
3. Deep links (`dbdesk://`) are needed to receive auth callbacks

### Current Flow (Analysis)

```
1. Desktop generates challenge → encrypts with XOR + static secret
2. Opens browser → web login page with challenge param
3. User logs in on web → web app gets token
4. Web redirects to dbdesk://callback?token=xxx&challenge=yyy
5. Desktop verifies challenge → stores bearer token in localStorage
6. All API calls use Authorization: Bearer <token>
```

**Issues**:
- XOR encryption with a predictable secret provides minimal security
- Challenge is stored in renderer `localStorage` — accessible to any code running in the renderer
- Token is also in `localStorage` — same concern
- No token refresh mechanism
- `fullSignOut` doesn't call the server to invalidate the token

### Recommended Auth Architecture

#### a) Use PKCE (Proof Key for Code Exchange)

PKCE is the industry standard for desktop/mobile OAuth flows. Replace the custom XOR challenge with proper PKCE:

```typescript
// src/main/lib/auth.ts (main process — not preload!)
import crypto from 'node:crypto'

export function generatePKCE() {
  // Generate random code verifier
  const codeVerifier = crypto.randomBytes(32).toString('base64url')

  // Create code challenge (SHA-256 hash of verifier)
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url')

  return { codeVerifier, codeChallenge }
}
```

**Flow**:
```
1. Main process generates PKCE pair (codeVerifier stored in main, codeChallenge sent to web)
2. Opens browser → login page with code_challenge param
3. User logs in → server stores code_challenge with the auth code
4. Redirect to dbdesk://callback?code=AUTH_CODE
5. Main process exchanges code + codeVerifier with server for tokens
6. Server validates: SHA256(codeVerifier) === stored code_challenge
7. Server returns access_token + refresh_token
8. Main process stores tokens securely (safeStorage)
```

#### b) Store Tokens in Main Process, Not Renderer

**Never store tokens in renderer `localStorage`**. Instead:

```typescript
// src/main/lib/token-store.ts
import { safeStorage } from 'electron'
import Store from 'electron-store' // or use your existing JSON storage

const store = new Store({ name: 'auth', encryptionKey: '...' })

export const tokenStore = {
  setTokens(accessToken: string, refreshToken: string) {
    if (safeStorage.isEncryptionAvailable()) {
      store.set('accessToken', safeStorage.encryptString(accessToken).toString('base64'))
      store.set('refreshToken', safeStorage.encryptString(refreshToken).toString('base64'))
    }
  },

  getAccessToken(): string | null {
    const encrypted = store.get('accessToken') as string | undefined
    if (!encrypted || !safeStorage.isEncryptionAvailable()) return null
    return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
  },

  getRefreshToken(): string | null {
    const encrypted = store.get('refreshToken') as string | undefined
    if (!encrypted || !safeStorage.isEncryptionAvailable()) return null
    return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
  },

  clear() {
    store.delete('accessToken')
    store.delete('refreshToken')
  }
}
```

#### c) Token Refresh Flow

```typescript
// src/main/lib/auth-manager.ts
import { tokenStore } from './token-store'
import { net } from 'electron'

class AuthManager {
  private refreshPromise: Promise<string> | null = null

  async getValidToken(): Promise<string> {
    const token = tokenStore.getAccessToken()
    if (token && !this.isExpired(token)) {
      return token
    }
    return this.refreshAccessToken()
  }

  private async refreshAccessToken(): Promise<string> {
    // Deduplicate concurrent refresh attempts
    if (this.refreshPromise) return this.refreshPromise

    this.refreshPromise = (async () => {
      const refreshToken = tokenStore.getRefreshToken()
      if (!refreshToken) throw new Error('No refresh token')

      const response = await net.fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      })

      if (!response.ok) {
        tokenStore.clear()
        throw new Error('Token refresh failed')
      }

      const { accessToken, refreshToken: newRefresh } = await response.json()
      tokenStore.setTokens(accessToken, newRefresh)
      return accessToken
    })()

    try {
      return await this.refreshPromise
    } finally {
      this.refreshPromise = null
    }
  }

  private isExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.exp * 1000 < Date.now() - 30_000 // 30s buffer
    } catch {
      return true
    }
  }
}

export const authManager = new AuthManager()
```

#### d) Proxy API Calls Through Main Process

Instead of the renderer making direct HTTP calls to the backend (which exposes tokens):

```typescript
// IPC handler in main process
safeHandle('api:request', async (payload: { method: string; path: string; body?: unknown }) => {
  const token = await authManager.getValidToken()

  const response = await net.fetch(`${API_URL}${payload.path}`, {
    method: payload.method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-desktop': 'true'
    },
    body: payload.body ? JSON.stringify(payload.body) : undefined
  })

  if (response.status === 401) {
    // Token expired, try refresh
    const newToken = await authManager.getValidToken()
    // Retry with new token...
  }

  return response.json()
})
```

This way:
- Tokens never leave the main process
- Renderer only knows "I'm authenticated" or "I'm not"
- Token refresh is handled transparently

#### e) Login/Logout IPC

```typescript
// Main process IPC handlers
safeHandle('auth:get-login-url', async () => {
  const { codeVerifier, codeChallenge } = generatePKCE()
  // Store codeVerifier in main process memory
  pendingAuth = { codeVerifier, createdAt: Date.now() }
  return `${WEB_URL}/login?code_challenge=${codeChallenge}&method=S256`
})

safeHandle('auth:get-session', async () => {
  const token = tokenStore.getAccessToken()
  if (!token) return null

  // Fetch user info from server
  const response = await net.fetch(`${API_URL}/api/auth/session`, {
    headers: { Authorization: `Bearer ${token}` }
  })

  if (!response.ok) return null
  return response.json()
})

safeHandle('auth:logout', async () => {
  const token = tokenStore.getAccessToken()
  if (token) {
    // Invalidate on server
    await net.fetch(`${API_URL}/api/auth/sign-out`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    }).catch(() => {})
  }
  tokenStore.clear()
  return { success: true }
})

// Handle deep link callback in main process
function handleAuthCallback(url: string) {
  const urlObj = new URL(url)
  const code = urlObj.searchParams.get('code')

  if (!code || !pendingAuth) return

  // Exchange code + verifier for tokens
  exchangeCodeForTokens(code, pendingAuth.codeVerifier)
    .then(({ accessToken, refreshToken }) => {
      tokenStore.setTokens(accessToken, refreshToken)
      // Notify renderer
      mainWindow?.webContents.send('auth:session-changed', { authenticated: true })
    })
}
```

### Auth Summary

| Aspect | Current | Recommended |
|--------|---------|-------------|
| Challenge | XOR with static secret | PKCE (SHA-256) |
| Token storage | Renderer `localStorage` | Main process `safeStorage` |
| API calls | Renderer → Server directly | Renderer → Main (IPC) → Server |
| Token refresh | None | Automatic in main process |
| Logout | Client-only clear | Server invalidation + client clear |
| Deep link handling | Token in URL | Auth code in URL (exchanged for token server-side) |

---

## 9. Implementation Roadmap

### Phase 1: Monorepo Setup (1-2 days)

1. Initialize Turborepo at root
2. Move current desktop app to `apps/desktop/`
3. Move server to `apps/server/`
4. Create `packages/shared` — extract types from `src/common/types/`
5. Create `packages/tsconfig` with shared presets
6. Verify `pnpm dev` and `pnpm build` work for both apps
7. Update import paths to use `@dbdesk/shared`

### Phase 2: Shared Types & Schemas (2-3 days)

1. Create Zod schemas in `packages/shared/src/schemas/` for all entities
2. Derive TypeScript types from Zod schemas (replace manual interfaces)
3. Update server to use shared schemas for validation
4. Update desktop IPC handlers to use shared schemas
5. Delete duplicated type definitions

### Phase 3: End-to-End Type Safety (2-3 days)

1. Set up Hono RPC routes on the server (chain route definitions for type inference)
2. Create `packages/api-client` with `hc<AppType>()` export
3. Replace `api-client.ts` in renderer with typed Hono client
4. Remove `ApiClient` class and manual fetch wrapper

### Phase 4: IPC Cleanup (2-3 days)

1. Define `IpcContract` type in shared package
2. Create typed IPC invoke/handle wrappers
3. Simplify `dbdesk-api.ts` to one-liner forwarding functions
4. Eliminate `api/client.ts` wrapper (use preload directly or through typed hook)
5. Split `ipc-handlers.ts` into domain-specific modules

### Phase 5: Auth Overhaul (3-4 days)

1. Implement PKCE in main process
2. Set up token storage with `safeStorage`
3. Implement token refresh in `AuthManager`
4. Move API calls to proxy through main process (or keep renderer direct with secure token access)
5. Update server auth routes for desktop PKCE flow
6. Update deep link handling for code exchange (not direct token)
7. Implement proper logout (server invalidation)

### Phase 6: Auto-Updates & Env (1-2 days)

1. Configure `electron-builder.yml` with publish config
2. Implement `auto-updater.ts` in main process
3. Add update notification UI in renderer
4. Remove `dotenv` from preload, use `define` in vite config
5. Set up `.env` / `.env.production` files
6. Set up CI/CD for automated releases

### Phase 7: Code Organization (1-2 days)

1. Adopt feature-based folder structure in renderer
2. Co-locate TanStack Query hooks with their feature modules
3. Clean up unused exports and dead code
4. Update `AGENTS.md` with new monorepo commands

---

## Quick Reference: Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Monorepo tool | **Turborepo** | Fast, simple config, great with pnpm |
| Package manager | **pnpm** (keep) | Already in use, strict, fast |
| E2E type safety | **Hono RPC** | Native to existing Hono backend |
| Validation | **Zod** (already installed) | Shared schemas, type inference |
| IPC type safety | **Typed contract** | Zero deps, compile-time safety |
| Token storage | **Electron safeStorage** | OS-level encryption |
| Auth flow | **PKCE** | Industry standard for desktop apps |
| Auto-updates | **electron-updater + GitHub Releases** | Already installed, minimal setup |
| Env handling | **electron-vite `define`** | Build-time embedding, no runtime dotenv |
