import { format } from 'date-fns'

/**
 * Generates a unique key for a cell based on its row index and column ID
 */
export function getCellKey(rowIndex: number, columnId: string): string {
  return `${rowIndex}:${columnId}`
}

/**
 * Parses a cell key back to its row index and column ID
 */
export function parseCellKey(cellKey: string): { rowIndex: number; columnId: string } {
  const [rowIndex, ...columnIdParts] = cellKey.split(':')
  const columnId = columnIdParts.join(':') // Handle column IDs that might contain ':'
  return {
    rowIndex: Number.parseInt(rowIndex, 10),
    columnId
  }
}

/**
 * Formats a cell value to a string for display
 * Merges normalization logic: handles null, undefined, objects, and primitives
 */
export function formatCellValue(value: unknown, dataType?: string): string {
  if (value === null) {
    return 'NULL'
  }

  if (value === undefined) {
    return ''
  }

  if (typeof value === 'string') {
    return value
  }

  if (value instanceof Date) {
    const isTimezoneAware =
      dataType?.includes('with time zone') ||
      dataType?.includes('tz') ||
      dataType === 'timestamptz' ||
      dataType === 'timetz'

    const formatString = isTimezoneAware ? 'yyyy-MM-dd HH:mm:ss.SSSxxx' : 'yyyy-MM-dd HH:mm:ss.SSS'

    try {
      return format(value, formatString)
    } catch {
      return value.toISOString()
    }
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return String(value)
    }
  }

  return String(value)
}

export type DataTableCellVariant = 'text' | 'numeric' | 'json' | 'boolean' | 'date' | 'enum'

const JSON_TYPES = new Set(['json', 'jsonb'])
const BOOLEAN_TYPES = new Set(['boolean', 'bool'])
const NUMERIC_TYPES = new Set([
  'smallint',
  'integer',
  'bigint',
  'int2',
  'int4',
  'int8',
  'real',
  'float4',
  'double precision',
  'float8',
  'numeric',
  'decimal',
  'smallserial',
  'serial',
  'serial2',
  'serial4',
  'serial8',
  'bigserial',
  'money'
])

const DATE_TYPES = new Set([
  'date',
  'timestamp',
  'timestamp without time zone',
  'timestamp with time zone',
  'timestamptz',
  'time',
  'time without time zone',
  'time with time zone',
  'timetz',
  'interval'
])

export function getCellVariant(
  dataType: string | undefined,
  enumValues?: string[]
): DataTableCellVariant {
  if (enumValues && enumValues.length > 0) {
    return 'enum'
  }

  if (!dataType) return 'text'
  const normalizedType = dataType.trim().toLowerCase()

  if (JSON_TYPES.has(normalizedType)) {
    return 'json'
  }
  if (BOOLEAN_TYPES.has(normalizedType)) {
    return 'boolean'
  }
  if (NUMERIC_TYPES.has(normalizedType)) {
    return 'numeric'
  }
  if (DATE_TYPES.has(normalizedType)) {
    return 'date'
  }

  return 'text'
}

/**
 * Determines the editor language based on column data type
 * Returns 'json' for json/jsonb types, 'plaintext' for everything else
 */
export function getEditorLanguage(dataType: string | undefined): string {
  return getCellVariant(dataType) === 'json' ? 'json' : 'plaintext'
}
