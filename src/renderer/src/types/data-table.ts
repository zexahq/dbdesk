/**
 * Represents the position of a cell in the table
 */
export interface CellPosition {
  rowIndex: number
  columnId: string
}

/**
 * Represents the selection state of cells in the table
 */
export interface SelectionState {
  selectedCells: Set<string>
  selectionRange: {
    start: CellPosition
    end: CellPosition
  } | null
  isSelecting: boolean
}

/**
 * Represents an update to a cell value
 */
export interface UpdateCell {
  rowIndex: number
  columnId: string
  value: unknown
}

/**
 * Represents the direction of navigation in the table
 */
export type NavigationDirection =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'home'
  | 'end'
  | 'ctrl+home'
  | 'ctrl+end'
  | 'pageup'
  | 'pagedown'
