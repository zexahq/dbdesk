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

