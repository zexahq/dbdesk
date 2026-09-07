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
  const { isAuthenticated } = useAuthStore.getState()
  if (isAuthenticated) {
    await router.navigate({ to: '/' })
  }
  await router.invalidate()
}

window.onAuthenticated(async (user) => {
  if (user) {
    // Trust the user from the main process immediately — avoids race condition
    // where tokenStore hasn't persisted the session cookie yet when getSession()
    // is called
    useAuthStore.getState().setUser(user)

    // Navigate to home immediately
    await router.navigate({ to: '/' })

    // Fetch the bearer token in the background with retries
    // (the token store write may still be in-flight)
    const fetchTokenWithRetry = async (retries = 5, delay = 500): Promise<void> => {
      for (let i = 0; i < retries; i++) {
        await new Promise((r) => setTimeout(r, delay))
        try {
          const tokenResult = await window.dbdesk.getToken()
          if (tokenResult?.token) {
            useAuthStore.getState().setToken(tokenResult.token)
            return
          }
        } catch { /* retry */ }
      }
    }
    void fetchTokenWithRetry()
  }
})

window.onUserUpdated((user) => {
  console.log('[auth] onUserUpdated fired, user:', user)
  void refreshAuthRouting()
})

window.onAuthError((ctx) => {
  console.error('[auth] onAuthError fired:', ctx)
  toast.error(ctx.message || 'Authentication failed.')
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Listen for background session invalidation from the main process.
// When the server verification finds the session expired, we show a
// sign-in overlay instead of redirecting — the user keeps their page visible.
window.dbdesk.onSessionInvalidated(() => {
  console.log('[auth] session invalidated by server background check')
  useAuthStore.getState().setSessionExpired(true)
})

// Listen for background session refresh from the main process.
// When the server confirms the session is valid, update the store.
window.dbdesk.onSessionRefreshed((session) => {
  console.log('[auth] session refreshed by server background check')
  useAuthStore.getState().setUser(session.user)
  if (session.session?.token) {
    useAuthStore.getState().setToken(session.session.token)
  }
  useAuthStore.getState().setSessionExpired(false)
})

// Refresh session from local cache (instant — no network) then render.
// The cache is checked first, so beforeLoad in the router is synchronous.
async function init() {
  await useAuthStore.getState().refreshSession()

  const root = ReactDOM.createRoot(document.getElementById('root')!)
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>
  )
}

void init()
