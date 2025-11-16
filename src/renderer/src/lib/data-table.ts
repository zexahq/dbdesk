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
 */
export function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  if (typeof value === 'string') {
    return value
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

/**
 * Determines the editor language based on column data type
 * Returns 'json' for json/jsonb types, 'plaintext' for everything else
 */
export function getEditorLanguage(dataType: string | undefined): string {
  if (!dataType) return 'plaintext'
  const normalizedType = dataType.toLowerCase()
  if (normalizedType === 'json' || normalizedType === 'jsonb') {
    return 'json'
  }
  return 'plaintext'
}
