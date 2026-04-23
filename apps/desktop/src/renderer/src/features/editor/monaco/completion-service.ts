import { type CompletionService, type ICompletionItem } from 'monaco-sql-languages'
import { languages } from 'monaco-editor'
import { useSqlWorkspaceStore } from '@renderer/features/sql-workspace/stores/sql-workspace-store'

/**
 * Resolve a dot-triggered column context from text before cursor.
 * Supports: schema.table. or table.
 */
function resolveDotContext(textBeforeCursor: string): {
  schema?: string
  table?: string
} | null {
  // Match schema.table. or table.
  const match = textBeforeCursor.match(
    /(?:(\w+)\.)?(\w+)\.\s*$/
  )
  if (!match) return null
  return {
    schema: match[1],
    table: match[2]
  }
}

export const createCompletionService: () => CompletionService =
  () => async (model, position, _context, suggestions, _entities, snippets) => {
    const completionItems: ICompletionItem[] = []

    const schemasWithTables = useSqlWorkspaceStore.getState().schemasWithTables
    const tableColumnsMap = useSqlWorkspaceStore.getState().tableColumns
    const getTableColumns = useSqlWorkspaceStore.getState().getTableColumns

    // Get text before cursor to detect dot-trigger context
    const lineContent = model.getLineContent(position.lineNumber)
    const textBeforeCursor = lineContent.substring(0, position.column - 1)

    const dotContext = resolveDotContext(textBeforeCursor)

    // If dot-triggered (e.g. "users." or "public.users."), show columns
    if (dotContext?.table) {
      const resolvedSchema = dotContext.schema ?? 'public'
      const columns = getTableColumns(resolvedSchema, dotContext.table)

      if (columns) {
        for (const col of columns) {
          const detail = col.type + (col.nullable ? '' : ' NOT NULL')
          completionItems.push({
            label: col.name,
            kind: languages.CompletionItemKind.Field,
            detail,
            sortText: `1_${col.name}`
          })

          // Suggest enum values if available
          if (col.enumValues) {
            for (const val of col.enumValues) {
              completionItems.push({
                label: `'${val}'`,
                kind: languages.CompletionItemKind.EnumMember,
                detail: `${col.name} enum value`,
                sortText: `1a_${val}`
              })
            }
          }
        }
        return completionItems
      }
    }

    // Add keyword completions with lower priority
    if (suggestions?.keywords) {
      for (const kw of suggestions.keywords) {
        completionItems.push({
          label: kw,
          kind: languages.CompletionItemKind.Keyword,
          detail: 'keyword',
          sortText: `3_${kw}`
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
          documentation: item.insertText,
          sortText: `3_${item.prefix}`
        })
      }
    }

    // Add schema and table completions from the store
    for (const { schema, tables } of schemasWithTables) {
      completionItems.push({
        label: schema,
        kind: languages.CompletionItemKind.Module,
        detail: 'schema',
        sortText: `2_${schema}`
      })

      for (const table of tables) {
        // Unqualified table name
        completionItems.push({
          label: table,
          kind: languages.CompletionItemKind.Class,
          detail: `table (${schema})`,
          sortText: `2_${table}`
        })

        // Qualified schema.table name
        if (schema !== 'public') {
          completionItems.push({
            label: `${schema}.${table}`,
            kind: languages.CompletionItemKind.Class,
            detail: `table (${schema})`,
            sortText: `2_${schema}.${table}`
          })
        }
      }
    }

    // Add columns from all tables (lower priority than tables, but available in column context)
    for (const [key, columns] of Object.entries(tableColumnsMap)) {
      for (const col of columns) {
        completionItems.push({
          label: col.name,
          kind: languages.CompletionItemKind.Field,
          detail: `${col.type} (${key})`,
          sortText: `2a_${col.name}`
        })
      }
    }

    return completionItems
  }
