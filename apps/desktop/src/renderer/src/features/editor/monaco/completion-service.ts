import type { ColumnInfo, SchemaWithTables } from '@dbdesk/shared/types'
import { languages } from 'monaco-editor'
import {
  EntityContextType,
  type EntityContext,
  type CompletionService,
  type ICompletionItem
} from 'monaco-sql-languages'
import {
  extractTableReferences,
  getCurrentStatementPrefix,
  parseQualifiedReferenceFromLine,
  resolveQualifiedReference,
  type CompletionReplacementRange,
  type TableReference
} from './completion-context'

const COMMON_KEYWORDS = new Set(['SELECT', 'FROM', 'WHERE', 'JOIN', 'GROUP', 'ORDER', 'LIMIT'])
const COLUMN_CONTEXT_TYPES = new Set([EntityContextType.COLUMN, EntityContextType.COLUMN_CREATE])
const TABLE_CONTEXT_TYPES = new Set([
  EntityContextType.TABLE,
  EntityContextType.TABLE_CREATE,
  EntityContextType.VIEW,
  EntityContextType.VIEW_CREATE
])
const DATABASE_CONTEXT_TYPES = new Set([EntityContextType.DATABASE, EntityContextType.DATABASE_CREATE])

type MonacoRange = {
  startLineNumber: number
  endLineNumber: number
  startColumn: number
  endColumn: number
}

const getColumnDetail = (column: ColumnInfo): string => {
  return `${column.type}${column.nullable ? '' : ' NOT NULL'}`
}

const withRange = (item: ICompletionItem, range: MonacoRange): ICompletionItem => ({
  ...item,
  range
})

const addUniqueItem = (
  items: ICompletionItem[],
  seen: Set<string>,
  item: ICompletionItem
) => {
  const key = `${String(item.label)}:${item.kind}:${item.detail ?? ''}`
  if (seen.has(key)) {
    return
  }

  seen.add(key)
  items.push(item)
}

const getTextBeforeCursor = (
  model: Parameters<CompletionService>[0],
  position: Parameters<CompletionService>[1]
) => {
  return model.getValueInRange({
    startLineNumber: 1,
    startColumn: 1,
    endLineNumber: position.lineNumber,
    endColumn: position.column
  })
}

const buildMonacoRange = (
  lineNumber: number,
  replacementRange: CompletionReplacementRange
): MonacoRange => ({
  startLineNumber: lineNumber,
  endLineNumber: lineNumber,
  startColumn: replacementRange.startColumn,
  endColumn: replacementRange.endColumn
})

const getDefaultReplacementRange = (
  model: Parameters<CompletionService>[0],
  position: Parameters<CompletionService>[1],
  suggestions: Parameters<CompletionService>[3]
): MonacoRange => {
  const syntaxRange = suggestions?.syntax
    .flatMap((item) => item.wordRanges)
    .findLast((wordRange) => wordRange.line === position.lineNumber)

  if (syntaxRange) {
    return {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: syntaxRange.startColumn,
      endColumn: position.column
    }
  }

  const wordUntilPosition = model.getWordUntilPosition(position)
  return {
    startLineNumber: position.lineNumber,
    endLineNumber: position.lineNumber,
    startColumn: wordUntilPosition.startColumn,
    endColumn: position.column
  }
}

const getCurrentStatementTableReferences = (
  textBeforeCursor: string,
  schemasWithTables: SchemaWithTables[]
) => {
  return extractTableReferences(getCurrentStatementPrefix(textBeforeCursor), schemasWithTables)
}

const getTablesForReference = (tableReferences: TableReference[], schema: string, table: string) => {
  const matches = tableReferences.filter((entry) => entry.schema === schema && entry.table === table)
  return matches.length > 0 ? matches : [{ schema, table }]
}

const addSchemaSuggestions = (
  items: ICompletionItem[],
  seen: Set<string>,
  schemasWithTables: SchemaWithTables[],
  range: MonacoRange
) => {
  for (const { schema } of schemasWithTables) {
    addUniqueItem(items, seen, withRange({
      label: schema,
      kind: languages.CompletionItemKind.Module,
      detail: 'schema',
      filterText: schema,
      sortText: `2_0_${schema}`
    }, range))
  }
}

const addTableSuggestions = (
  items: ICompletionItem[],
  seen: Set<string>,
  schemasWithTables: SchemaWithTables[],
  range: MonacoRange
) => {
  for (const { schema, tables } of schemasWithTables) {
    for (const table of tables) {
      addUniqueItem(items, seen, withRange({
        label: table,
        kind: languages.CompletionItemKind.Class,
        detail: `table (${schema})`,
        filterText: `${table} ${schema}.${table}`,
        sortText: `2_1_${table}`
      }, range))
      addUniqueItem(items, seen, withRange({
        label: `${schema}.${table}`,
        kind: languages.CompletionItemKind.Class,
        detail: 'schema-qualified table',
        filterText: `${schema}.${table} ${table}`,
        sortText: `2_2_${schema}.${table}`
      }, range))
    }
  }
}

const addSchemaTableSuggestions = (
  items: ICompletionItem[],
  seen: Set<string>,
  schema: string,
  tables: string[],
  range: MonacoRange
) => {
  for (const table of tables) {
    addUniqueItem(items, seen, withRange({
      label: table,
      kind: languages.CompletionItemKind.Class,
      detail: `table (${schema})`,
      filterText: `${table} ${schema}.${table}`,
      sortText: `2_0_${table}`
    }, range))
  }
}

const addColumnSuggestions = (
  items: ICompletionItem[],
  seen: Set<string>,
  columns: ColumnInfo[],
  range: MonacoRange,
  sourceLabel?: string,
  priority = '1_0'
) => {
  for (const column of columns) {
    addUniqueItem(items, seen, withRange({
      label: column.name,
      kind: languages.CompletionItemKind.Field,
      detail: sourceLabel ? `${sourceLabel} • ${getColumnDetail(column)}` : getColumnDetail(column),
      filterText: column.name,
      sortText: `${priority}_${column.name}`
    }, range))
  }
}

const addStatementColumnSuggestions = (
  items: ICompletionItem[],
  seen: Set<string>,
  tableReferences: TableReference[],
  getTableColumns: (schema: string, table: string) => ColumnInfo[] | undefined,
  range: MonacoRange
) => {
  const seenColumnLabels = new Set<string>()

  for (const { schema, table, alias } of tableReferences) {
    const columns = getTableColumns(schema, table)
    if (!columns) {
      continue
    }

    for (const column of columns) {
      if (seenColumnLabels.has(column.name)) {
        continue
      }

      seenColumnLabels.add(column.name)
      addColumnSuggestions(items, seen, [column], range, alias ? `${schema}.${table} as ${alias}` : `${schema}.${table}`, '1_0')
    }
  }

  return seenColumnLabels
}

const addAllColumnSuggestions = (
  items: ICompletionItem[],
  seen: Set<string>,
  schemasWithTables: SchemaWithTables[],
  getTableColumns: (schema: string, table: string) => ColumnInfo[] | undefined,
  range: MonacoRange,
  existingColumnLabels = new Set<string>()
) => {
  for (const { schema, tables } of schemasWithTables) {
    for (const table of tables) {
      const columns = getTableColumns(schema, table)
      if (!columns) {
        continue
      }

      for (const column of columns) {
        if (existingColumnLabels.has(column.name)) {
          continue
        }

        existingColumnLabels.add(column.name)
        addColumnSuggestions(items, seen, [column], range, `${schema}.${table}`, '1_1')
      }
    }
  }

  return existingColumnLabels
}

const addEnumValueSuggestions = (
  items: ICompletionItem[],
  seen: Set<string>,
  tableReferences: TableReference[],
  schemasWithTables: SchemaWithTables[],
  getTableColumns: (schema: string, table: string) => ColumnInfo[] | undefined,
  range: MonacoRange
) => {
  const seenEnumValues = new Set<string>()
  const enumSources = tableReferences.length > 0
    ? tableReferences
    : schemasWithTables.flatMap(({ schema, tables }) => tables.map((table) => ({ schema, table })))

  for (const { schema, table } of enumSources) {
    const columns = getTableColumns(schema, table)
    if (!columns) {
      continue
    }

    for (const column of columns) {
      for (const enumValue of column.enumValues ?? []) {
        if (seenEnumValues.has(enumValue)) {
          continue
        }

        seenEnumValues.add(enumValue)
        addUniqueItem(items, seen, withRange({
          label: enumValue,
          insertText: `'${enumValue}'`,
          kind: languages.CompletionItemKind.Value,
          detail: `enum value (${schema}.${table}.${column.name})`,
          sortText: `1_2_${enumValue}`
        }, range))
      }
    }
  }
}

const addKeywordSuggestions = (
  items: ICompletionItem[],
  seen: Set<string>,
  keywords: string[],
  range: MonacoRange
) => {
  for (const keyword of keywords) {
    addUniqueItem(items, seen, withRange({
      label: keyword,
      kind: languages.CompletionItemKind.Keyword,
      detail: 'keyword',
      filterText: keyword,
      sortText: `3_${COMMON_KEYWORDS.has(keyword.toUpperCase()) ? '0' : '1'}_${keyword}`
    }, range))
  }
}

const addSnippetSuggestions = (
  items: ICompletionItem[],
  seen: Set<string>,
  snippets: NonNullable<Parameters<CompletionService>[5]>,
  range: MonacoRange
) => {
  for (const snippet of snippets) {
    addUniqueItem(items, seen, withRange({
      label: snippet.label || snippet.prefix,
      kind: languages.CompletionItemKind.Snippet,
      filterText: snippet.prefix,
      insertText: snippet.insertText,
      insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
      detail: snippet.description || 'snippet',
      documentation: snippet.insertText,
      sortText: `4_${snippet.label || snippet.prefix}`
    }, range))
  }
}

const getEntitiesInCaretStatement = (entities: EntityContext[] | null) => {
  return (entities ?? []).filter((entity) => entity.belongStmt.isContainCaret)
}

const getCurrentStatementTablesFromEntities = (
  entities: EntityContext[] | null,
  schemasWithTables: SchemaWithTables[]
): TableReference[] => {
  const seen = new Set<string>()
  const tableReferences: TableReference[] = []

  for (const entity of getEntitiesInCaretStatement(entities)) {
    if (!TABLE_CONTEXT_TYPES.has(entity.entityContextType)) {
      continue
    }

    const matches = entity.text.includes('.')
      ? entity.text.split('.').slice(-2)
      : [entity.text]

    const normalizedMatches = matches.map((segment) => segment.replace(/^"|"$/g, '').replace(/""/g, '"'))
    const resolved = normalizedMatches.length === 2
      ? getTablesForReference([], normalizedMatches[0], normalizedMatches[1])
      : schemasWithTables
          .filter((schema) => schema.tables.includes(normalizedMatches[0]))
          .map((schema) => ({ schema: schema.schema, table: normalizedMatches[0] }))

    for (const tableReference of resolved) {
      const key = `${tableReference.schema}.${tableReference.table}`
      if (seen.has(key)) {
        continue
      }

      seen.add(key)
      tableReferences.push(tableReference)
    }
  }

  return tableReferences
}

export const createCompletionService = (
  getSchemasWithTables: () => SchemaWithTables[],
  getTableColumns: (schema: string, table: string) => ColumnInfo[] | undefined
): CompletionService => {
  return async (model, position, _context, suggestions, entities, snippets) => {
    const items: ICompletionItem[] = []
    const seen = new Set<string>()
    const schemasWithTables = getSchemasWithTables()
    const syntaxContextTypes = new Set(suggestions?.syntax.map((item) => item.syntaxContextType) ?? [])
    const textBeforeCursor = getTextBeforeCursor(model, position)
    const linePrefix = model.getLineContent(position.lineNumber).slice(0, position.column - 1)
    const qualifiedReference = parseQualifiedReferenceFromLine(linePrefix, position.column)
    const replacementRange = qualifiedReference
      ? buildMonacoRange(position.lineNumber, qualifiedReference.replacementRange)
      : getDefaultReplacementRange(model, position, suggestions)
    const statementTableReferences = [
      ...getCurrentStatementTablesFromEntities(entities, schemasWithTables),
      ...getCurrentStatementTableReferences(textBeforeCursor, schemasWithTables)
    ].filter((reference, index, allReferences) => {
      return allReferences.findIndex((entry) => {
        return (
          entry.schema === reference.schema &&
          entry.table === reference.table &&
          entry.alias === reference.alias
        )
      }) === index
    })

    if (qualifiedReference) {
      const resolvedReference = resolveQualifiedReference(
        qualifiedReference,
        statementTableReferences,
        schemasWithTables
      )

      if (resolvedReference?.kind === 'tables' && resolvedReference.schema) {
        const schemaEntry = schemasWithTables.find((entry) => entry.schema === resolvedReference.schema)
        if (schemaEntry) {
          addSchemaTableSuggestions(items, seen, schemaEntry.schema, schemaEntry.tables, replacementRange)
          return items
        }
      }

      if (resolvedReference?.kind === 'columns' && resolvedReference.tableReferences?.length) {
        for (const tableReference of resolvedReference.tableReferences) {
          const columns = getTableColumns(tableReference.schema, tableReference.table) ?? []
          addColumnSuggestions(
            items,
            seen,
            columns,
            replacementRange,
            tableReference.alias
              ? `${tableReference.schema}.${tableReference.table} as ${tableReference.alias}`
              : `${tableReference.schema}.${tableReference.table}`,
            '1_0'
          )
        }
        return items
      }
    }

    const prefersColumnSuggestions =
      [...syntaxContextTypes].some((type) => COLUMN_CONTEXT_TYPES.has(type as EntityContextType)) &&
      ![...syntaxContextTypes].some((type) => TABLE_CONTEXT_TYPES.has(type as EntityContextType))
    const prefersSchemaSuggestions =
      [...syntaxContextTypes].some((type) => DATABASE_CONTEXT_TYPES.has(type as EntityContextType)) &&
      ![...syntaxContextTypes].some((type) => TABLE_CONTEXT_TYPES.has(type as EntityContextType))

    if (prefersColumnSuggestions) {
      const seenStatementColumns = addStatementColumnSuggestions(
        items,
        seen,
        statementTableReferences,
        getTableColumns,
        replacementRange
      )
      addAllColumnSuggestions(
        items,
        seen,
        schemasWithTables,
        getTableColumns,
        replacementRange,
        seenStatementColumns
      )
      addEnumValueSuggestions(
        items,
        seen,
        statementTableReferences,
        schemasWithTables,
        getTableColumns,
        replacementRange
      )
    } else if (prefersSchemaSuggestions) {
      addSchemaSuggestions(items, seen, schemasWithTables, replacementRange)
    } else {
      addSchemaSuggestions(items, seen, schemasWithTables, replacementRange)
      addTableSuggestions(items, seen, schemasWithTables, replacementRange)
    }

    addKeywordSuggestions(items, seen, suggestions?.keywords ?? [], replacementRange)

    if (snippets) {
      addSnippetSuggestions(items, seen, snippets, replacementRange)
    }

    return items
  }
}
