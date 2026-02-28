import { type CompletionService, type ICompletionItem } from 'monaco-sql-languages'
import { languages } from 'monaco-editor'
import { useSqlWorkspaceStore } from '@renderer/features/sql-workspace/stores/sql-workspace-store'

// Custom completion service that includes table/schema completions from the store
export const createCompletionService: () => CompletionService =
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
