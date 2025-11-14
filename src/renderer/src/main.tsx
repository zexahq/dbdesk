import './styles/main.css'

import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

// Import the generated route tree
import { routeTree } from './routeTree.gen'
import { queryClient } from './lib/query-client'

// Create a new router instance
const router = createRouter({ routeTree })

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
        {/* {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />} */}
      </QueryClientProvider>
    </StrictMode>
  )
}
