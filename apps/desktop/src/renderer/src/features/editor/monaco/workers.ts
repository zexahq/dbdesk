import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'

import 'monaco-sql-languages/esm/languages/mysql/mysql.contribution'
import 'monaco-sql-languages/esm/languages/pgsql/pgsql.contribution'
import MYSQLWorker from 'monaco-sql-languages/esm/languages/mysql/mysql.worker?worker'
import PGSQLWorker from 'monaco-sql-languages/esm/languages/pgsql/pgsql.worker?worker'

import { LanguageIdEnum, setupLanguageFeatures } from 'monaco-sql-languages'
import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import { createCompletionService } from './completion-service'
import { registerSqlInlineCompletionProvider } from './inline-completion-provider'
import { useSqlWorkspaceStore } from '@renderer/features/sql-workspace/stores/sql-workspace-store'

const supportedSqlLanguageIds = [LanguageIdEnum.PG, LanguageIdEnum.MYSQL]

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
      return new MYSQLWorker()
    }
    return new EditorWorker()
  }
}

const completionService = createCompletionService(
  () => useSqlWorkspaceStore.getState().schemasWithTables,
  (schema, table) => useSqlWorkspaceStore.getState().getTableColumns(schema, table)
)

for (const languageId of supportedSqlLanguageIds) {
  setupLanguageFeatures(languageId, {
    completionItems: {
      enable: true,
      triggerCharacters: [' ', '.'],
      completionService
    }
  })
}

// Inline ghost-text suggestions for SQL keywords (Tab to accept).
registerSqlInlineCompletionProvider()

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
