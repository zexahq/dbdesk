import { create } from 'zustand'
import type { ColumnSizingState, RowSelectionState } from '@tanstack/react-table'
import type { CellPosition, SelectionState, UpdateCell } from '@renderer/types/data-table'

interface DataTableStore {
  // Cell focus and editing
  focusedCell: CellPosition | null
  editingCell: CellPosition | null

  // Selection state
  selectionState: SelectionState
  rowSelection: RowSelectionState
  shiftAnchor: CellPosition | null

  // Column sizing
  columnSizing: ColumnSizingState

  // Pending updates
  pendingUpdates: UpdateCell[]

  // Actions
  setFocusedCell: (cell: CellPosition | null) => void
  setEditingCell: (cell: CellPosition | null) => void
  setSelectionState: (state: SelectionState | ((prev: SelectionState) => SelectionState)) => void
  setRowSelection: (
    selection: RowSelectionState | ((prev: RowSelectionState) => RowSelectionState)
  ) => void
  setShiftAnchor: (anchor: CellPosition | null) => void
  setColumnSizing: (
    sizing: ColumnSizingState | ((prev: ColumnSizingState) => ColumnSizingState)
  ) => void
  setPendingUpdates: (updates: UpdateCell[] | ((prev: UpdateCell[]) => UpdateCell[])) => void
  clearSelection: () => void
  reset: () => void
}

const createInitialSelectionState = (): SelectionState => ({
  selectedCells: new Set(),
  selectionRange: null,
  isSelecting: false
})

export const useDataTableStore = create<DataTableStore>((set) => ({
  // Initial state
  focusedCell: null,
  editingCell: null,
  selectionState: createInitialSelectionState(),
  rowSelection: {},
  shiftAnchor: null,
  columnSizing: {},
  pendingUpdates: [],

  // Actions
  setFocusedCell: (cell) => set({ focusedCell: cell }),
  setEditingCell: (cell) => set({ editingCell: cell }),
  setSelectionState: (state) =>
    set((prev) => ({
      selectionState: typeof state === 'function' ? state(prev.selectionState) : state
    })),
  setRowSelection: (selection) =>
    set((state) => ({
      rowSelection: typeof selection === 'function' ? selection(state.rowSelection) : selection
    })),
  setShiftAnchor: (anchor) => set({ shiftAnchor: anchor }),
  setColumnSizing: (sizing) =>
    set((state) => ({
      columnSizing: typeof sizing === 'function' ? sizing(state.columnSizing) : sizing
    })),
  setPendingUpdates: (updates) =>
    set((state) => ({
      pendingUpdates: typeof updates === 'function' ? updates(state.pendingUpdates) : updates
    })),
  clearSelection: () =>
    set({
      selectionState: createInitialSelectionState()
    }),
  reset: () =>
    set({
      focusedCell: null,
      editingCell: null,
      selectionState: createInitialSelectionState(),
      rowSelection: {},
      shiftAnchor: null,
      columnSizing: {},
      pendingUpdates: []
    })
}))
