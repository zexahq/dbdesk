import type { CellPosition, NavigationDirection, UpdateCell } from '@renderer/types/data-table'
import type { Cell } from '@tanstack/react-table'
import * as React from 'react'

export interface DataTableCellProps<TData, TValue> {
  cell: Cell<TData, TValue>
  rowIndex: number
  columnId: string
  focusedCell: CellPosition | null
  editingCell: CellPosition | null
  onCellClick: (rowIndex: number, columnId: string, e: React.MouseEvent) => void
  onCellDoubleClick: (rowIndex: number, columnId: string, e: React.MouseEvent) => void
  onCellEditingStop: (opts?: { moveToNextRow?: boolean; direction?: NavigationDirection }) => void
  onDataUpdate: (updates: UpdateCell | Array<UpdateCell>) => void
  tableContainerRef: React.RefObject<HTMLDivElement | null>
}
