import type { SchemaWithTables } from '@dbdesk/shared/types'
import { splitQueryBySemicolons } from '@renderer/features/editor/lib/sql-parser'

export interface CompletionReplacementRange {
  startColumn: number
  endColumn: number
}

export interface QualifiedReference {
  qualifierSegments: string[]
  partialSegment: string
  trailingDot: boolean
  replacementRange: CompletionReplacementRange
}

export interface TableReference {
  schema: string
  table: string
  alias?: string
}

export interface QualifiedReferenceResolution {
  kind: 'columns' | 'tables'
  tableReferences?: TableReference[]
  schema?: string
}

const RESERVED_ALIAS_WORDS = new Set([
  'WHERE',
  'JOIN',
  'INNER',
  'LEFT',
  'RIGHT',
  'FULL',
  'CROSS',
  'ON',
  'USING',
  'GROUP',
  'ORDER',
  'LIMIT',
  'OFFSET',
  'HAVING',
  'RETURNING',
  'UNION',
  'EXCEPT',
  'INTERSECT',
  'SET',
  'VALUES'
])

const IDENTIFIER_PATTERN = '(?:"(?:[^"]|"")*"|[A-Za-z_][A-Za-z0-9_$]*)'
const TABLE_REFERENCE_PATTERN = new RegExp(
  `\\b(?:FROM|JOIN|UPDATE|INTO)\\s+((?:${IDENTIFIER_PATTERN})(?:\\s*\\.\\s*(?:${IDENTIFIER_PATTERN}))?)(?:\\s+(?:AS\\s+)?(${IDENTIFIER_PATTERN}))?`,
  'gi'
)

const isIdentifierCharacter = (char: string | undefined) => {
  return Boolean(char && /[A-Za-z0-9_$]/.test(char))
}

const normalizeIdentifier = (identifier: string) => {
  const trimmed = identifier.trim()
  if (!trimmed.startsWith('"') || !trimmed.endsWith('"')) {
    return trimmed
  }

  return trimmed.slice(1, -1).replace(/""/g, '"')
}

const splitIdentifierPath = (text: string): string[] => {
  const segments: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < text.length; index++) {
    const char = text[index]

    if (char === '"') {
      current += char
      if (inQuotes && text[index + 1] === '"') {
        current += '"'
        index += 1
        continue
      }

      inQuotes = !inQuotes
      continue
    }

    if (!inQuotes && char === '.') {
      if (current.trim()) {
        segments.push(normalizeIdentifier(current))
      }
      current = ''
      continue
    }

    if (!inQuotes && /\s/.test(char)) {
      continue
    }

    current += char
  }

  if (current.trim()) {
    segments.push(normalizeIdentifier(current))
  }

  return segments
}

const resolveTablePath = (path: string[], schemasWithTables: SchemaWithTables[]): TableReference[] => {
  if (path.length === 2) {
    const [schema, table] = path
    const schemaEntry = schemasWithTables.find((entry) => entry.schema === schema)
    if (!schemaEntry?.tables.includes(table)) {
      return []
    }

    return [{ schema, table }]
  }

  if (path.length !== 1) {
    return []
  }

  const table = path[0]
  const matches = schemasWithTables
    .filter((entry) => entry.tables.includes(table))
    .map((entry) => ({ schema: entry.schema, table }))

  if (matches.length <= 1) {
    return matches
  }

  const publicMatch = matches.find((entry) => entry.schema === 'public')
  return publicMatch ? [publicMatch, ...matches.filter((entry) => entry.schema !== 'public')] : matches
}

const parseBackwardIdentifier = (
  linePrefix: string,
  endIndex: number
): { text: string; startIndex: number; endIndex: number } | null => {
  if (endIndex < 0) {
    return null
  }

  if (linePrefix[endIndex] === '"') {
    let index = endIndex - 1
    let text = ''

    while (index >= 0) {
      const char = linePrefix[index]
      if (char === '"') {
        if (index > 0 && linePrefix[index - 1] === '"') {
          text = `"${text}`
          index -= 2
          continue
        }

        return {
          text,
          startIndex: index,
          endIndex
        }
      }

      text = `${char}${text}`
      index -= 1
    }

    return null
  }

  let index = endIndex
  while (index >= 0 && isIdentifierCharacter(linePrefix[index])) {
    index -= 1
  }

  const startIndex = index + 1
  if (startIndex > endIndex) {
    return null
  }

  return {
    text: linePrefix.slice(startIndex, endIndex + 1),
    startIndex,
    endIndex
  }
}

export const getCurrentStatementPrefix = (textBeforeCursor: string) => {
  const statements = splitQueryBySemicolons(textBeforeCursor)
  return statements.at(-1) ?? textBeforeCursor
}

export const parseQualifiedReferenceFromLine = (
  linePrefix: string,
  cursorColumn: number
): QualifiedReference | null => {
  let index = linePrefix.length - 1
  while (index >= 0 && /\s/.test(linePrefix[index])) {
    index -= 1
  }

  let trailingDot = false
  let partialSegment = ''
  let replacementStartColumn = cursorColumn
  const qualifierSegments: string[] = []
  const pushQualifierSegment = () => {
    const segment = parseBackwardIdentifier(linePrefix, index)
    if (!segment) {
      return false
    }

    qualifierSegments.unshift(normalizeIdentifier(segment.text))
    index = segment.startIndex - 1
    return true
  }

  if (index >= 0 && linePrefix[index] === '.') {
    trailingDot = true
    index -= 1
    while (index >= 0 && /\s/.test(linePrefix[index])) {
      index -= 1
    }

    if (!pushQualifierSegment()) {
      return null
    }
  } else {
    const partial = parseBackwardIdentifier(linePrefix, index)
    if (!partial) {
      return null
    }

    partialSegment = normalizeIdentifier(partial.text)
    replacementStartColumn = partial.startIndex + 1
    index = partial.startIndex - 1
  }

  while (index >= 0) {
    while (index >= 0 && /\s/.test(linePrefix[index])) {
      index -= 1
    }

    if (index < 0 || linePrefix[index] !== '.') {
      break
    }

    index -= 1
    while (index >= 0 && /\s/.test(linePrefix[index])) {
      index -= 1
    }

    if (!pushQualifierSegment()) {
      return null
    }
  }

  if (qualifierSegments.length === 0) {
    return null
  }

  return {
    qualifierSegments,
    partialSegment,
    trailingDot,
    replacementRange: {
      startColumn: replacementStartColumn,
      endColumn: cursorColumn
    }
  }
}

export const extractTableReferences = (
  statementPrefix: string,
  schemasWithTables: SchemaWithTables[]
): TableReference[] => {
  const tableReferences: TableReference[] = []
  const seen = new Set<string>()

  for (const match of statementPrefix.matchAll(TABLE_REFERENCE_PATTERN)) {
    const pathText = match[1]
    if (!pathText) {
      continue
    }

    const alias = match[2] ? normalizeIdentifier(match[2]) : undefined
    const resolvedTables = resolveTablePath(splitIdentifierPath(pathText), schemasWithTables)
    for (const tableReference of resolvedTables) {
      const sanitizedAlias = alias && !RESERVED_ALIAS_WORDS.has(alias.toUpperCase()) ? alias : undefined
      const key = `${tableReference.schema}.${tableReference.table}:${sanitizedAlias ?? ''}`
      if (seen.has(key)) {
        continue
      }

      seen.add(key)
      tableReferences.push({
        ...tableReference,
        alias: sanitizedAlias
      })
    }
  }

  return tableReferences
}

export const resolveQualifiedReference = (
  reference: QualifiedReference,
  tableReferences: TableReference[],
  schemasWithTables: SchemaWithTables[]
): QualifiedReferenceResolution | null => {
  if (reference.qualifierSegments.length === 1) {
    const owner = reference.qualifierSegments[0]
    const aliasMatches = tableReferences.filter((entry) => entry.alias === owner)
    if (aliasMatches.length > 0) {
      return {
        kind: 'columns',
        tableReferences: aliasMatches
      }
    }

    const statementTableMatches = tableReferences.filter((entry) => entry.table === owner)
    if (statementTableMatches.length > 0) {
      return {
        kind: 'columns',
        tableReferences: statementTableMatches
      }
    }

    const schemaEntry = schemasWithTables.find((entry) => entry.schema === owner)
    if (schemaEntry) {
      return {
        kind: 'tables',
        schema: schemaEntry.schema
      }
    }

    const resolvedTables = resolveTablePath([owner], schemasWithTables)
    if (resolvedTables.length > 0) {
      return {
        kind: 'columns',
        tableReferences: resolvedTables
      }
    }

    return null
  }

  if (reference.qualifierSegments.length === 2) {
    const [schema, table] = reference.qualifierSegments
    const resolvedTables = resolveTablePath([schema, table], schemasWithTables)
    if (resolvedTables.length === 0) {
      return null
    }

    return {
      kind: 'columns',
      tableReferences: resolvedTables
    }
  }

  return null
}
