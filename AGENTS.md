# DBDesk - Agent Guidelines

## Build/Test Commands

Always use `pnpm` (not npm or yarn) for all commands.

- **Build**: `pnpm run build` (runs typecheck + electron-vite build)
- **Dev**: `pnpm run dev` (start development with noSandbox)
- **Lint**: `pnpm run lint` (ESLint with cache)
- **Format**: `pnpm run format` (Prettier formatting)
- **Type Check**: `pnpm run typecheck` (checks both node and web)
- **Type Check Node**: `pnpm run typecheck:node`
- **Type Check Web**: `pnpm run typecheck:web`

## Code Style

- **Imports**: Use `@common/*`, `@renderer/*` path aliases; organize imports with prettier-plugin-organize-imports
- **Formatting**: Single quotes, no semicolons, 100 char width, no trailing commas (Prettier config)
- **Types**: Strict TypeScript, use `type` for object types, `interface` for extensible contracts
- **Naming**: PascalCase for components/classes, camelCase for functions/variables, kebab-case for files
- **Error Handling**: Use Result types, proper error boundaries in React components
- **React**: Use functional components, hooks, JSX runtime (no React imports needed)
- **UI Components**: Radix UI + Tailwind CSS, components in `src/renderer/src/components/ui/`
- **State**: Zustand for global state, TanStack Query for server state, TanStack Form for forms

## Architecture

- Electron app: main process (`src/main/`), renderer (`src/renderer/`), preload (`src/preload/`), common types (`src/common/`)
- Database adapters pattern in `src/main/adapters/` with shared interfaces
- Path aliases configured: `@common/*` and `@renderer/*`
