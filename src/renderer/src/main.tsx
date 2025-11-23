import './styles/main.css'

import loader from '@monaco-editor/loader'
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'

import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'

// Import the generated route tree
import { queryClient } from './lib/query-client'
import { routeTree } from './routeTree.gen'

// Import Monaco Editor workers
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'

// Configure Monaco Environment for workers
window.MonacoEnvironment = {
  getWorker(_moduleId: string, label: string) {
    if (label === 'json') {
      return new JsonWorker()
    }
    return new EditorWorker()
  }
}

// Configure Monaco to only load English locale (reduces bundle size)
loader.config({
  paths: {
    vs: 'app-asset://dbdesk/node_modules/monaco-editor/min/vs'
  },
  'vs/nls': {
    availableLanguages: {
      '*': 'en' // Only load English locale, exclude all other language packs
    }
  }
})

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
