'use client'

import {
  type ColumnDef,
  type ColumnSizingState,
  getCoreRowModel,
  type TableOptions,
  useReactTable
} from '@tanstack/react-table'
import * as React from 'react'
import { getCellKey, parseCellKey } from '@renderer/lib/data-table'
import type {
  CellPosition,
  NavigationDirection,
  SelectionState,
  UpdateCell
} from '@renderer/types/data-table'

interface UseDataTableProps<TData, TValue = unknown>
  extends Omit<TableOptions<TData>, 'getCoreRowModel'> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onDataChange?: (data: TData[]) => void
}

export function useDataTable<TData, TValue = unknown>({
  columns,
  data,
  onDataChange,
  ...tableOptions
}: UseDataTableProps<TData, TValue>) {
  const tableContainerRef = React.useRef<HTMLDivElement>(null)
  const tableRef = React.useRef<ReturnType<typeof useReactTable<TData>>>(null)

  // State management
  const [focusedCell, setFocusedCell] = React.useState<CellPosition | null>(null)
  const [editingCell, setEditingCell] = React.useState<CellPosition | null>(null)
  const [selectionState, setSelectionState] = React.useState<SelectionState>({
    selectedCells: new Set(),
    selectionRange: null,
    isSelecting: false
  })
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
  const [pendingUpdates, setPendingUpdates] = React.useState<UpdateCell[]>([])

  // Get column IDs
  const columnIds = React.useMemo(() => {
    return columns
      .map((c) => {
        if (c.id) return c.id
        if ('accessorKey' in c) return c.accessorKey as string
        return undefined
      })
      .filter((id): id is string => Boolean(id))
  }, [columns])

  // Table instance
  const table = useReactTable({
    ...tableOptions,
    data,
    columns,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    getCoreRowModel: getCoreRowModel(),
    state: {
      ...tableOptions.state,
      columnSizing
    },
    onColumnSizingChange: setColumnSizing
  })

  if (!tableRef.current) {
    tableRef.current = table
  }

  // Helper to check if cell is selected
  const getIsCellSelected = React.useCallback(
    (rowIndex: number, columnId: string) => {
      return selectionState.selectedCells.has(getCellKey(rowIndex, columnId))
    },
    [selectionState.selectedCells]
  )

  // Clear selection
  const clearSelection = React.useCallback(() => {
    setSelectionState({
      selectedCells: new Set(),
      selectionRange: null,
      isSelecting: false
    })
  }, [])

  // Select all cells
  const selectAll = React.useCallback(() => {
    const rows = table.getRowModel().rows
    const rowCount = rows.length
    const allCells = new Set<string>()

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
      for (const columnId of columnIds) {
        allCells.add(getCellKey(rowIndex, columnId))
      }
    }

    const firstColumnId = columnIds[0]
    const lastColumnId = columnIds[columnIds.length - 1]

    setSelectionState({
      selectedCells: allCells,
      selectionRange:
        columnIds.length > 0 && rowCount > 0 && firstColumnId && lastColumnId
          ? {
              start: { rowIndex: 0, columnId: firstColumnId },
              end: { rowIndex: rowCount - 1, columnId: lastColumnId }
            }
          : null,
      isSelecting: false
    })
  }, [table, columnIds])

  // Select range
  const selectRange = React.useCallback(
    (start: CellPosition, end: CellPosition, isSelecting = false) => {
      const startColIndex = columnIds.indexOf(start.columnId)
      const endColIndex = columnIds.indexOf(end.columnId)

      const minRow = Math.min(start.rowIndex, end.rowIndex)
      const maxRow = Math.max(start.rowIndex, end.rowIndex)
      const minCol = Math.min(startColIndex, endColIndex)
      const maxCol = Math.max(startColIndex, endColIndex)

      const selectedCells = new Set<string>()

      for (let rowIndex = minRow; rowIndex <= maxRow; rowIndex++) {
        for (let colIndex = minCol; colIndex <= maxCol; colIndex++) {
          const columnId = columnIds[colIndex]
          if (columnId) {
            selectedCells.add(getCellKey(rowIndex, columnId))
          }
        }
      }

      setSelectionState({
        selectedCells,
        selectionRange: { start, end },
        isSelecting
      })
    },
    [columnIds]
  )

  // Focus cell
  const focusCell = React.useCallback((rowIndex: number, columnId: string) => {
    setFocusedCell({ rowIndex, columnId })
    setEditingCell(null)

    // Focus the container if needed
    if (tableContainerRef.current && document.activeElement !== tableContainerRef.current) {
      tableContainerRef.current.focus()
    }
  }, [])

  // Navigate cell
  const navigateCell = React.useCallback(
    (direction: NavigationDirection) => {
      if (!focusedCell) return

      const { rowIndex, columnId } = focusedCell
      const currentColIndex = columnIds.indexOf(columnId)
      const rows = table.getRowModel().rows
      const rowCount = rows.length

      let newRowIndex = rowIndex
      let newColumnId = columnId

      switch (direction) {
        case 'up':
          newRowIndex = Math.max(0, rowIndex - 1)
          break
        case 'down':
          newRowIndex = Math.min(rowCount - 1, rowIndex + 1)
          break
        case 'left':
          if (currentColIndex > 0) {
            const prevColumnId = columnIds[currentColIndex - 1]
            if (prevColumnId) newColumnId = prevColumnId
          }
          break
        case 'right':
          if (currentColIndex < columnIds.length - 1) {
            const nextColumnId = columnIds[currentColIndex + 1]
            if (nextColumnId) newColumnId = nextColumnId
          }
          break
        case 'home':
          if (columnIds.length > 0) {
            newColumnId = columnIds[0] ?? columnId
          }
          break
        case 'end':
          if (columnIds.length > 0) {
            newColumnId = columnIds[columnIds.length - 1] ?? columnId
          }
          break
        case 'ctrl+home':
          newRowIndex = 0
          if (columnIds.length > 0) {
            newColumnId = columnIds[0] ?? columnId
          }
          break
        case 'ctrl+end':
          newRowIndex = Math.max(0, rowCount - 1)
          if (columnIds.length > 0) {
            newColumnId = columnIds[columnIds.length - 1] ?? columnId
          }
          break
        case 'pageup': {
          const container = tableContainerRef.current
          if (container) {
            const containerHeight = container.clientHeight
            const rowHeight = 40 // Approximate row height, can be made dynamic
            const pageSize = Math.floor(containerHeight / rowHeight) || 10
            newRowIndex = Math.max(0, rowIndex - pageSize)
          } else {
            newRowIndex = Math.max(0, rowIndex - 10)
          }
          break
        }
        case 'pagedown': {
          const container = tableContainerRef.current
          if (container) {
            const containerHeight = container.clientHeight
            const rowHeight = 40 // Approximate row height, can be made dynamic
            const pageSize = Math.floor(containerHeight / rowHeight) || 10
            newRowIndex = Math.min(rowCount - 1, rowIndex + pageSize)
          } else {
            newRowIndex = Math.min(rowCount - 1, rowIndex + 10)
          }
          break
        }
      }

      if (newRowIndex !== rowIndex || newColumnId !== columnId) {
        focusCell(newRowIndex, newColumnId)
      }
    },
    [focusedCell, columnIds, table, focusCell]
  )

  // Start editing cell
  const onCellEditingStart = React.useCallback((rowIndex: number, columnId: string) => {
    setFocusedCell({ rowIndex, columnId })
    setEditingCell({ rowIndex, columnId })
  }, [])

  // Stop editing cell
  const onCellEditingStop = React.useCallback(
    (opts?: { moveToNextRow?: boolean; direction?: NavigationDirection }) => {
      setEditingCell(null)

      if (opts?.moveToNextRow && focusedCell) {
        const { rowIndex, columnId } = focusedCell
        const rows = table.getRowModel().rows
        const rowCount = rows.length

        const nextRowIndex = rowIndex + 1
        if (nextRowIndex < rowCount) {
          requestAnimationFrame(() => {
            focusCell(nextRowIndex, columnId)
          })
        }
      } else if (opts?.direction && focusedCell) {
        const { rowIndex, columnId } = focusedCell
        focusCell(rowIndex, columnId)
        requestAnimationFrame(() => {
          navigateCell(opts.direction ?? 'right')
        })
      }
    },
    [focusedCell, table, focusCell, navigateCell]
  )

  // Handle data updates
  const onDataUpdate = React.useCallback(
    (updates: UpdateCell | Array<UpdateCell>) => {
      const updateArray = Array.isArray(updates) ? updates : [updates]

      if (updateArray.length === 0) return

      // Store updates in pendingUpdates for future UI
      setPendingUpdates((prev) => [...prev, ...updateArray])

      // If onDataChange is provided, apply updates immediately
      if (onDataChange) {
        const rows = table.getRowModel().rows
        const rowUpdatesMap = new Map<number, Array<Omit<UpdateCell, 'rowIndex'>>>()

        for (const update of updateArray) {
          const row = rows[update.rowIndex]
          if (!row) continue

          const originalData = row.original
          const originalRowIndex = data.indexOf(originalData)
          if (originalRowIndex === -1) continue

          const existingUpdates = rowUpdatesMap.get(originalRowIndex) ?? []
          existingUpdates.push({
            columnId: update.columnId,
            value: update.value
          })
          rowUpdatesMap.set(originalRowIndex, existingUpdates)
        }

        const newData = data.map((row, index) => {
          const updates = rowUpdatesMap.get(index)
          if (!updates) return row

          const updatedRow = { ...row } as Record<string, unknown>
          for (const { columnId, value } of updates) {
            updatedRow[columnId] = value
          }
          return updatedRow as TData
        })

        onDataChange(newData)
      }
    },
    [data, onDataChange, table]
  )

  // Handle cell click
  const onCellClick = React.useCallback(
    (rowIndex: number, columnId: string, event?: React.MouseEvent) => {
      // Ignore right-click
      if (event?.button === 2) {
        return
      }

      const cellKey = getCellKey(rowIndex, columnId)

      if (event) {
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault()
          const newSelectedCells = new Set(selectionState.selectedCells)

          if (newSelectedCells.has(cellKey)) {
            newSelectedCells.delete(cellKey)
          } else {
            newSelectedCells.add(cellKey)
          }

          setSelectionState({
            selectedCells: newSelectedCells,
            selectionRange: null,
            isSelecting: false
          })
          focusCell(rowIndex, columnId)
          return
        }

        if (event.shiftKey && focusedCell) {
          event.preventDefault()
          selectRange(focusedCell, { rowIndex, columnId })
          return
        }
      }

      // Clear selection if clicking elsewhere
      const hasSelectedCells = selectionState.selectedCells.size > 0
      if (hasSelectedCells && !selectionState.isSelecting) {
        const isClickingSelectedCell = selectionState.selectedCells.has(cellKey)

        if (!isClickingSelectedCell) {
          clearSelection()
        } else {
          focusCell(rowIndex, columnId)
          return
        }
      }

      if (focusedCell?.rowIndex === rowIndex && focusedCell?.columnId === columnId) {
        onCellEditingStart(rowIndex, columnId)
      } else {
        focusCell(rowIndex, columnId)
      }
    },
    [selectionState, focusedCell, focusCell, onCellEditingStart, selectRange, clearSelection]
  )

  // Handle cell double click
  const onCellDoubleClick = React.useCallback(
    (rowIndex: number, columnId: string, event?: React.MouseEvent) => {
      if (event?.defaultPrevented) return
      onCellEditingStart(rowIndex, columnId)
    },
    [onCellEditingStart]
  )

  // Handle cell mouse down (for drag selection)
  const onCellMouseDown = React.useCallback(
    (rowIndex: number, columnId: string, event: React.MouseEvent) => {
      if (event.button === 2) {
        return
      }

      event.preventDefault()

      if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
        setSelectionState({
          selectedCells: new Set(),
          selectionRange: {
            start: { rowIndex, columnId },
            end: { rowIndex, columnId }
          },
          isSelecting: true
        })
      }
    },
    []
  )

  // Handle cell mouse enter (for drag selection)
  const onCellMouseEnter = React.useCallback(
    (rowIndex: number, columnId: string, _event: React.MouseEvent) => {
      if (selectionState.isSelecting && selectionState.selectionRange) {
        const start = selectionState.selectionRange.start

        if (focusedCell?.rowIndex !== start.rowIndex || focusedCell?.columnId !== start.columnId) {
          focusCell(start.rowIndex, start.columnId)
        }

        selectRange(start, { rowIndex, columnId }, true)
      }
    },
    [selectionState, focusedCell, selectRange, focusCell]
  )

  // Handle cell mouse up
  const onCellMouseUp = React.useCallback(() => {
    setSelectionState((prev) => ({
      ...prev,
      isSelecting: false
    }))
  }, [])

  // Handle keyboard events
  const onKeyDown = React.useCallback(
    (event: KeyboardEvent) => {
      const { key, ctrlKey, metaKey, shiftKey } = event
      const isCtrlPressed = ctrlKey || metaKey

      if (editingCell) return

      if (!focusedCell) return

      let direction: NavigationDirection | null = null

      // Select all
      if (isCtrlPressed && key === 'a') {
        event.preventDefault()
        selectAll()
        return
      }

      // Delete/Backspace to clear selected cells
      if (key === 'Delete' || key === 'Backspace') {
        if (selectionState.selectedCells.size > 0) {
          event.preventDefault()
          const updates: UpdateCell[] = []

          selectionState.selectedCells.forEach((cellKey) => {
            const { rowIndex, columnId } = parseCellKey(cellKey)
            updates.push({ rowIndex, columnId, value: '' })
          })

          onDataUpdate(updates)
          clearSelection()
        }
        return
      }

      // Navigation keys
      switch (key) {
        case 'ArrowUp':
          direction = 'up'
          break
        case 'ArrowDown':
          direction = 'down'
          break
        case 'ArrowLeft':
          direction = 'left'
          break
        case 'ArrowRight':
          direction = 'right'
          break
        case 'Home':
          direction = isCtrlPressed ? 'ctrl+home' : 'home'
          break
        case 'End':
          direction = isCtrlPressed ? 'ctrl+end' : 'end'
          break
        case 'PageUp':
          direction = 'pageup'
          break
        case 'PageDown':
          direction = 'pagedown'
          break
        case 'Escape':
          event.preventDefault()
          if (selectionState.selectedCells.size > 0) {
            clearSelection()
          } else {
            setFocusedCell(null)
            setEditingCell(null)
          }
          return
        case 'Tab':
          event.preventDefault()
          direction = shiftKey ? 'left' : 'right'
          break
        case 'Enter':
          if (!editingCell) {
            event.preventDefault()
            onCellEditingStart(focusedCell.rowIndex, focusedCell.columnId)
          }
          return
      }

      if (direction) {
        event.preventDefault()

        // Shift+Arrow for range selection
        if (shiftKey && key !== 'Tab' && focusedCell) {
          const currentColIndex = columnIds.indexOf(focusedCell.columnId)
          let newRowIndex = focusedCell.rowIndex
          let newColumnId = focusedCell.columnId

          switch (direction) {
            case 'up':
              newRowIndex = Math.max(0, focusedCell.rowIndex - 1)
              break
            case 'down':
              newRowIndex = Math.min(table.getRowModel().rows.length - 1, focusedCell.rowIndex + 1)
              break
            case 'left':
              if (currentColIndex > 0) {
                const prevColumnId = columnIds[currentColIndex - 1]
                if (prevColumnId) newColumnId = prevColumnId
              }
              break
            case 'right':
              if (currentColIndex < columnIds.length - 1) {
                const nextColumnId = columnIds[currentColIndex + 1]
                if (nextColumnId) newColumnId = nextColumnId
              }
              break
          }

          const selectionStart = selectionState.selectionRange?.start || focusedCell
          selectRange(selectionStart, {
            rowIndex: newRowIndex,
            columnId: newColumnId
          })
          focusCell(newRowIndex, newColumnId)
        } else {
          if (selectionState.selectedCells.size > 0) {
            clearSelection()
          }
          navigateCell(direction)
        }
      }
    },
    [
      editingCell,
      focusedCell,
      selectionState,
      columnIds,
      table,
      selectAll,
      onDataUpdate,
      clearSelection,
      navigateCell,
      selectRange,
      focusCell,
      onCellEditingStart
    ]
  )

  // Set up keyboard event listener
  React.useEffect(() => {
    const container = tableContainerRef.current
    if (!container) return

    container.addEventListener('keydown', onKeyDown)
    return () => {
      container.removeEventListener('keydown', onKeyDown)
    }
  }, [onKeyDown])

  // Prevent text selection during drag selection
  React.useEffect(() => {
    function preventSelection(event: Event) {
      if (selectionState.isSelecting) {
        event.preventDefault()
      }
    }

    if (selectionState.isSelecting) {
      document.addEventListener('selectstart', preventSelection)
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('selectstart', preventSelection)
      document.body.style.userSelect = ''
    }
  }, [selectionState.isSelecting])

  return {
    table,
    tableContainerRef,
    focusedCell,
    editingCell,
    selectionState,
    columnSizing,
    pendingUpdates,
    getIsCellSelected,
    onCellClick,
    onCellDoubleClick,
    onCellMouseDown,
    onCellMouseEnter,
    onCellMouseUp,
    onCellEditingStart,
    onCellEditingStop,
    onDataUpdate,
    clearSelection
  }
}
