import type { QueryResultRow } from '@dbdesk/shared/types'

export type ResultExportFormat = 'csv' | 'json' | 'tsv'

export type EditableSelectTarget = {
  schema: string
  table: string
}

const SQL_IDENTIFIER = '(?:"(?:[^"]|"")+"|[A-Za-z_][A-Za-z0-9_$]*)'
const EDITABLE_SELECT_PATTERN = new RegExp(
  [
    '^\\s*select\\s+\\*\\s+from\\s+',
    `(${SQL_IDENTIFIER})\\s*\\.\\s*`,
    `(${SQL_IDENTIFIER})\\s*;?\\s*$`
  ].join(''),
  'i'
)

const unquoteIdentifier = (identifier: string) =>
  identifier.startsWith('"') ? identifier.slice(1, -1).replaceAll('""', '"') : identifier

/** Only exact, schema-qualified SELECT * queries are safe to map back to a table row. */
export function getEditableSelectTarget(query?: string): EditableSelectTarget | null {
  if (!query) return null

  const match = query.match(EDITABLE_SELECT_PATTERN)
  if (!match?.[1] || !match[2]) return null

  return {
    schema: unquoteIdentifier(match[1]),
    table: unquoteIdentifier(match[2])
  }
}

const jsonReplacer = (_key: string, value: unknown) =>
  typeof value === 'bigint' ? value.toString() : value

const SPREADSHEET_FORMULA_PREFIX = /^[=+\-@\t\r]/

const stringifyCell = (value: unknown) => {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') return JSON.stringify(value, jsonReplacer)
  return String(value)
}

const escapeDelimitedCell = (value: unknown, delimiter: ',' | '\t') => {
  const stringValue = stringifyCell(value)
  const text =
    typeof value === 'string' && SPREADSHEET_FORMULA_PREFIX.test(stringValue)
      ? `'${stringValue}`
      : stringValue
  if (!text.includes(delimiter) && !/["\r\n]/.test(text)) return text
  return `"${text.replaceAll('"', '""')}"`
}

export function serializeQueryResult(
  columns: string[],
  rows: QueryResultRow[],
  format: ResultExportFormat
) {
  if (format === 'json') return JSON.stringify(rows, jsonReplacer, 2)

  const delimiter = format === 'csv' ? ',' : '\t'
  return [
    columns.map((column) => escapeDelimitedCell(column, delimiter)).join(delimiter),
    ...rows.map((row) =>
      columns.map((column) => escapeDelimitedCell(row[column], delimiter)).join(delimiter)
    )
  ].join('\n')
}

export function downloadQueryResult(
  columns: string[],
  rows: QueryResultRow[],
  format: ResultExportFormat
) {
  const mimeTypes: Record<ResultExportFormat, string> = {
    csv: 'text/csv;charset=utf-8',
    json: 'application/json;charset=utf-8',
    tsv: 'text/tab-separated-values;charset=utf-8'
  }
  const timestamp = new Date()
    .toISOString()
    .replaceAll(':', '-')
    .replace(/\.\d{3}Z$/, 'Z')
  const url = URL.createObjectURL(
    new Blob([serializeQueryResult(columns, rows, format)], { type: mimeTypes[format] })
  )
  const link = document.createElement('a')
  link.href = url
  link.download = `query-result-${timestamp}.${format}`
  link.click()
  URL.revokeObjectURL(url)
}
