import './styles/main.css'

import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'

import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'

// Import the generated route tree
import { queryClient } from './lib/query-client'
import { registerWorkspaceFlushListener } from './lib/workspace'
import { routeTree } from './routeTree.gen'

import './monaco/workers'

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
