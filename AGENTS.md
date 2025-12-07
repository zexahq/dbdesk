# DBDesk - Agent Guidelines

## Build/Test Commands

- **Build**: `npm run build` (runs typecheck + electron-vite build)
- **Dev**: `npm run dev` (start development with noSandbox)
- **Lint**: `npm run lint` (ESLint with cache)
- **Format**: `npm run format` (Prettier formatting)
- **Type Check**: `npm run typecheck` (checks both node and web)
- **Type Check Node**: `npm run typecheck:node`
- **Type Check Web**: `npm run typecheck:web`

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
