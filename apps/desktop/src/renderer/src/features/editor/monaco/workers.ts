import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'

import 'monaco-sql-languages/esm/languages/mysql/mysql.contribution'
import 'monaco-sql-languages/esm/languages/pgsql/pgsql.contribution'
import type { ColumnInfo } from '@dbdesk/shared/types'
import MYSQLWorker from 'monaco-sql-languages/esm/languages/mysql/mysql.worker?worker'
import PGSQLWorker from 'monaco-sql-languages/esm/languages/pgsql/pgsql.worker?worker'

import { LanguageIdEnum, setupLanguageFeatures } from 'monaco-sql-languages'
import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import { createCompletionService } from './completion-service'
import { useSqlWorkspaceStore } from '@renderer/features/sql-workspace/stores/sql-workspace-store'
import { dbdeskClient } from '@renderer/shared/api/client'

const supportedSqlLanguageIds = [LanguageIdEnum.PG, LanguageIdEnum.MYSQL]
const pendingColumnLoads = new Map<string, Promise<ColumnInfo[] | undefined>>()
const sqlSuggestTriggerCharacters = [
  ' ',
  '.',
  '_',
  ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
]

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
  (schema, table) => useSqlWorkspaceStore.getState().getTableColumns(schema, table),
  async (schema, table) => {
    const { currentConnectionId, getTableColumns } = useSqlWorkspaceStore.getState()
    const cachedColumns = getTableColumns(schema, table)
    if (cachedColumns || !currentConnectionId) {
      return cachedColumns
    }

    const cacheKey = `${currentConnectionId}:${schema}.${table}`
    const pendingLoad = pendingColumnLoads.get(cacheKey)
    if (pendingLoad) {
      return pendingLoad
    }

    const load = dbdeskClient
      .introspectTable(currentConnectionId, schema, table)
      .then((tableInfo) => {
        if (useSqlWorkspaceStore.getState().currentConnectionId === currentConnectionId) {
          useSqlWorkspaceStore.getState().setTableColumns(schema, table, tableInfo.columns)
        }
        return tableInfo.columns
      })
      .catch((error) => {
        console.error(`Failed to load columns for ${schema}.${table}`, error)
        return undefined
      })
      .finally(() => {
        pendingColumnLoads.delete(cacheKey)
      })

    pendingColumnLoads.set(cacheKey, load)
    return load
  }
)

for (const languageId of supportedSqlLanguageIds) {
  setupLanguageFeatures(languageId, {
    completionItems: {
      enable: true,
      triggerCharacters: sqlSuggestTriggerCharacters,
      completionService
    }
  })

  monaco.languages.registerCompletionItemProvider(languageId, {
    triggerCharacters: sqlSuggestTriggerCharacters,
    async provideCompletionItems(model, position, context) {
      const fallbackRange = model.getWordUntilPosition(position)
      const completions = await completionService(model, position, context, null, null, [])
      const suggestions = Array.isArray(completions) ? completions : completions.suggestions
      const mappedSuggestions = suggestions.map((item) => ({
        ...item,
        label: item.label,
        kind: item.kind,
        insertText:
          item.insertText ?? (typeof item.label === 'string' ? item.label : item.label.label),
        range:
          item.range ??
          new monaco.Range(
            position.lineNumber,
            fallbackRange.startColumn,
            position.lineNumber,
            position.column
          )
      })) as monaco.languages.CompletionItem[]

      return {
        suggestions: mappedSuggestions,
        incomplete: Array.isArray(completions) ? false : completions.incomplete,
        dispose: Array.isArray(completions) ? undefined : completions.dispose
      }
    }
  })
}

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
