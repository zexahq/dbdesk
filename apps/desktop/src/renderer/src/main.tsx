import './styles/main.css'

import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'

import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

// Import the generated route tree
import { useAuthStore } from '@renderer/features/auth/stores/auth-store'
import { queryClient } from '@renderer/shared/lib/query-client'
import { registerWorkspaceFlushListener } from '@renderer/features/sql-workspace/lib/workspace'
import { routeTree } from './routeTree.gen'

import '@renderer/features/editor/monaco/workers'

// Listen for main-process flush requests (app quit)
registerWorkspaceFlushListener()

function setupContentSecurityPolicy() {
  const apiUrl = window.env.API_URL
  const apiHost = new URL(apiUrl).origin

  const csp = `default-src 'self'; script-src 'self'; worker-src 'self' blob:; connect-src 'self' ${apiHost}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https://lh3.googleusercontent.com`

  const meta = document.createElement('meta')
  meta.httpEquiv = 'Content-Security-Policy'
  meta.content = csp
  document.head.appendChild(meta)
}

setupContentSecurityPolicy()

// Create a new router instance
const router = createRouter({
  routeTree,
  defaultPreload: 'intent'
})

async function refreshAuthRouting() {
  await useAuthStore.getState().refreshSession()
  await router.invalidate()
}

window.onAuthenticated(() => {
  void refreshAuthRouting()
})

window.onUserUpdated(() => {
  void refreshAuthRouting()
})

window.onAuthError((ctx) => {
  toast.error(ctx.message || 'Authentication failed.')
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Render the app
const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>
  )
}
