import './styles/main.css'

import loader from '@monaco-editor/loader'
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'

import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'

// Import the generated route tree
import { queryClient } from './lib/query-client'
import { registerWorkspaceFlushListener } from './lib/workspace'
import { routeTree } from './routeTree.gen'

// Import Monaco Editor workers
import * as monaco from 'monaco-editor'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'

import MySQLWorker from 'monaco-sql-languages/esm/languages/mysql/mysql.worker?worker'
import PGSQLWorker from 'monaco-sql-languages/esm/languages/pgsql/pgsql.worker?worker'

import {
  type CompletionService,
  type ICompletionItem,
  LanguageIdEnum,
  setupLanguageFeatures
} from 'monaco-sql-languages'
import { languages } from 'monaco-editor'
import { useSqlWorkspaceStore } from './store/sql-workspace-store'

// Configure Monaco Environment for workers
window.MonacoEnvironment = {
  getWorker(_moduleId: string, label: string) {
    if (label === 'json') {
      return new JsonWorker()
    }
    if (label === LanguageIdEnum.PG) {
      return new PGSQLWorker()
    }
    if (label === LanguageIdEnum.MYSQL) {
      return new MySQLWorker()
    }
    return new EditorWorker()
  }
}

// Custom completion service that includes table/schema completions from the store
const createCompletionService: () => CompletionService =
  () => async (_model, _position, _context, suggestions, _entities, snippets) => {
    const completionItems: ICompletionItem[] = []

    // Add keyword completions (default behavior)
    if (suggestions?.keywords) {
      for (const kw of suggestions.keywords) {
        completionItems.push({
          label: kw,
          kind: languages.CompletionItemKind.Keyword,
          detail: 'keyword'
        })
      }
    }

    // Add snippet completions
    if (snippets) {
      for (const item of snippets) {
        completionItems.push({
          label: item.label || item.prefix,
          kind: languages.CompletionItemKind.Snippet,
          filterText: item.prefix,
          insertText: item.insertText,
          insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: item.description || 'snippet',
          documentation: item.insertText
        })
      }
    }

    // Add schema and table completions from the store
    const schemasWithTables = useSqlWorkspaceStore.getState().schemasWithTables
    for (const { schema, tables } of schemasWithTables) {
      // Add schema completion
      completionItems.push({
        label: schema,
        kind: languages.CompletionItemKind.Module,
        detail: 'schema'
      })

      // Add table completions
      for (const table of tables) {
        completionItems.push({
          label: table,
          kind: languages.CompletionItemKind.Class,
          detail: `table (${schema})`
        })
      }
    }

    return completionItems
  }

setupLanguageFeatures(LanguageIdEnum.PG, {
  completionItems: {
    enable: true,
    triggerCharacters: [' ', '.'],
    completionService: createCompletionService()
  }
})

setupLanguageFeatures(LanguageIdEnum.MYSQL, {
  completionItems: {
    enable: true,
    triggerCharacters: [' ', '.'],
    completionService: createCompletionService()
  }
})

// Configure Monaco to only load English locale (reduces bundle size)
loader.config({
  monaco,
  paths: {
    vs: 'app-asset://node_modules/monaco-editor/min/vs'
  },
  'vs/nls': {
    availableLanguages: {
      '*': 'en' // Only load English locale, exclude all other language packs
    }
  }
})

// Listen for main-process flush requests (app quit)
registerWorkspaceFlushListener()

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
