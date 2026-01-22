'use client'

import type { TableSortRule } from '@common/types'
import type { CellPosition, NavigationDirection, UpdateCell } from '@renderer/types/data-table'
import {
  type ColumnDef,
  getCoreRowModel,
  type OnChangeFn,
  type RowSelectionState,
  type TableOptions,
  type Updater,
  useReactTable
} from '@tanstack/react-table'
import {
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import type { QueryResultRow } from '@renderer/api/client'
import { toast } from '@renderer/lib/toast'
import { useTabStore } from '@renderer/store/tab-store'

interface UseDataTableProps<TData, TValue = unknown>
  extends Omit<TableOptions<TData>, 'getCoreRowModel'> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onCellUpdate?: (columnToUpdate: string, newValue: unknown, row: QueryResultRow) => Promise<void>
  onTableInteract?: () => void
  rowSelection: RowSelectionState
  onRowSelectionChange: OnChangeFn<RowSelectionState>
  // Optional sorting support
  sortRules?: TableSortRule[]
  // Tab ID for origin tracking (optional - only for table tabs)
  tabId?: string
}

const NON_NAVIGABLE_COLUMN_IDS = ['select', 'actions']
const ARROW_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])

export function useDataTable<TData, TValue = unknown>({
  columns,
  data,
  onCellUpdate,
  onTableInteract,
  rowSelection,
  onRowSelectionChange,
  sortRules,
  tabId,
  ...tableOptions
}: UseDataTableProps<TData, TValue>) {
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<ReturnType<typeof useReactTable<TData>>>(null)
  const rowMapRef = useRef<Map<number, HTMLTableRowElement>>(new Map())

  // Access origin from tab store directly (avoids prop drilling)
  // Memoize selector to prevent unnecessary re-renders from object reference changes
  const originSelector = useCallback(
    (s: ReturnType<typeof useTabStore.getState>) => {
      if (!tabId) return undefined
      const tab = s.tabs.find((t) => t.id === tabId)
      return tab?.kind === 'table' ? tab.origin : undefined
    },
    [tabId]
  )
  const origin = useTabStore(originSelector)
  const updateTableOrigin = useTabStore((s) => s.updateTableOrigin)

  const [focusedCell, setFocusedCell] = useState<CellPosition | null>(null)
  const [editingCell, setEditingCell] = useState<CellPosition | null>(null)
  const [columnSizing, setColumnSizing] = useState<Record<string, number>>({})

  const columnIds = useMemo(() => {
    return columns
      .map((c) => {
        if (c.id) return c.id
        if ('accessorKey' in c) return c.accessorKey as string
        return undefined
      })
      .filter((id): id is string => Boolean(id))
  }, [columns])

  const navigableColumnIds = useMemo(() => {
    return columnIds.filter((c) => !NON_NAVIGABLE_COLUMN_IDS.includes(c))
  }, [columnIds])

  const hasInitializedOrigin = useRef(false)
  const lastValidatedOriginRef = useRef<{ rowIndex: number; columnId: string } | null>(null)

  // Initialize or validate the origin (persisted cell position) when data/columns change.
  // This ensures the focused cell stays within bounds after data updates, and initializes
  // to the first cell on first render. Origin is NOT in deps to avoid infinite loops
  // when we update it inside this effect.
  useEffect(() => {
    const currentOrigin = origin

    if (data.length === 0) {
      setFocusedCell(null)
      if (tabId && currentOrigin) {
        updateTableOrigin(tabId, undefined)
      }
      lastValidatedOriginRef.current = null
      return
    }

    if (navigableColumnIds.length === 0 || !tabId) return

    if (!currentOrigin && !hasInitializedOrigin.current) {
      const firstColumnId = navigableColumnIds[0]
      if (firstColumnId) {
        hasInitializedOrigin.current = true
        const newOrigin = { rowIndex: 0, columnId: firstColumnId }
        lastValidatedOriginRef.current = newOrigin
        updateTableOrigin(tabId, newOrigin)
        setFocusedCell(newOrigin)
      }
    } else if (currentOrigin) {
      if (
        lastValidatedOriginRef.current?.rowIndex === currentOrigin.rowIndex &&
        lastValidatedOriginRef.current?.columnId === currentOrigin.columnId
      ) {
        return
      }

      const isValidRow = currentOrigin.rowIndex < data.length
      const isValidColumn = navigableColumnIds.includes(currentOrigin.columnId)

      if (isValidRow && isValidColumn) {
        lastValidatedOriginRef.current = currentOrigin
        setFocusedCell((prev) => {
          if (prev?.rowIndex === currentOrigin.rowIndex && prev?.columnId === currentOrigin.columnId) {
            return prev
          }
          return currentOrigin
        })
      } else {
        const firstColumnId = navigableColumnIds[0]
        if (firstColumnId) {
          const validOrigin = {
            rowIndex: Math.min(currentOrigin.rowIndex, data.length - 1),
            columnId: isValidColumn ? currentOrigin.columnId : firstColumnId
          }
          lastValidatedOriginRef.current = validOrigin
          updateTableOrigin(tabId, validOrigin)
          setFocusedCell(validOrigin)
        }
      }
    }
  }, [data.length, navigableColumnIds, tabId, updateTableOrigin])

  // Sync focusedCell when origin changes externally (e.g., switching tabs restores
  // the persisted position). Only updates if origin differs from what we last validated.
  useEffect(() => {
    if (!origin || !tabId) return

    if (
      lastValidatedOriginRef.current?.rowIndex !== origin.rowIndex ||
      lastValidatedOriginRef.current?.columnId !== origin.columnId
    ) {
      const isValidRow = origin.rowIndex < data.length
      const isValidColumn = navigableColumnIds.includes(origin.columnId)
      if (isValidRow && isValidColumn) {
        lastValidatedOriginRef.current = origin
        setFocusedCell(origin)
      }
    }
  }, [origin, tabId, data.length, navigableColumnIds])

  // Reset initialization tracking when tabId changes so a new tab can initialize its origin.
  useEffect(() => {
    hasInitializedOrigin.current = false
    lastValidatedOriginRef.current = null
  }, [tabId])

  const handleRowSelectionChange = useCallback(
    (updater: Updater<RowSelectionState>) => {
      const newSelection = typeof updater === 'function' ? updater(rowSelection) : updater
      onRowSelectionChange(newSelection)
    },
    [rowSelection, onRowSelectionChange]
  )

  const table = useReactTable({
    ...tableOptions,
    data,
    columns,
    enableColumnResizing: true,
    enableRowSelection: true,
    columnResizeMode: 'onChange',
    getCoreRowModel: getCoreRowModel(),
    state: {
      ...tableOptions.state,
      columnSizing,
      rowSelection
    },
    meta: {
      ...(sortRules && { sortRules })
    },
    onColumnSizingChange: setColumnSizing,
    onRowSelectionChange: handleRowSelectionChange
  })

  if (!tableRef.current) {
    tableRef.current = table
  }

  const scrollCellIntoView = useCallback(
    (rowIndex: number, columnId: string, direction?: NavigationDirection) => {
      const container = tableContainerRef.current
      if (!container) return

      const rowElement = rowMapRef.current.get(rowIndex)
      if (!rowElement) {
        const headerElement = container.querySelector('thead')
        const headerHeight = headerElement?.getBoundingClientRect().height ?? 0
        const approximateRowHeight = 40
        const targetScrollTop = rowIndex * approximateRowHeight

        const viewportTop = container.scrollTop + headerHeight
        const viewportBottom = container.scrollTop + container.clientHeight

        if (targetScrollTop < viewportTop) {
          container.scrollTop = Math.max(0, targetScrollTop - headerHeight)
        } else if (targetScrollTop + approximateRowHeight > viewportBottom) {
          container.scrollTop = targetScrollTop + approximateRowHeight - container.clientHeight
        }
        return
      }

      const headerElement = container.querySelector('thead')
      const headerHeight = headerElement?.getBoundingClientRect().height ?? 0
      const containerRect = container.getBoundingClientRect()

      const viewportTop = container.scrollTop + headerHeight
      const viewportBottom = container.scrollTop + container.clientHeight

      const rowTop = rowElement.offsetTop
      const rowBottom = rowTop + rowElement.offsetHeight

      const isFullyVisible = rowTop >= viewportTop && rowBottom <= viewportBottom

      if (isFullyVisible) {
        const cellElement = rowElement.querySelector(
          `[data-column-id="${columnId}"]`
        ) as HTMLElement
        if (cellElement) {
          const cellRect = cellElement.getBoundingClientRect()
          const containerLeft = containerRect.left
          const containerRight = containerRect.right

          if (cellRect.left < containerLeft) {
            container.scrollLeft = container.scrollLeft + (cellRect.left - containerLeft)
          } else if (cellRect.right > containerRight) {
            container.scrollLeft = container.scrollLeft + (cellRect.right - containerRight)
          }
        }
        return
      }

      if (direction === 'down' || direction === 'pagedown' || direction === 'ctrl+end') {
        const scrollNeeded = rowBottom - viewportBottom
        if (scrollNeeded > 0) {
          container.scrollTop += scrollNeeded
        }
      } else if (direction === 'up' || direction === 'pageup' || direction === 'ctrl+home') {
        const scrollNeeded = viewportTop - rowTop
        if (scrollNeeded > 0) {
          container.scrollTop -= scrollNeeded
        }
      } else {
        const rowCenter = rowTop + rowElement.offsetHeight / 2
        const viewportCenter = viewportTop + (viewportBottom - viewportTop) / 2
        const scrollNeeded = rowCenter - viewportCenter
        container.scrollTop += scrollNeeded
      }

      const cellElement = rowElement.querySelector(`[data-column-id="${columnId}"]`) as HTMLElement
      if (cellElement) {
        const cellRect = cellElement.getBoundingClientRect()
        const containerLeft = containerRect.left
        const containerRight = containerRect.right

        if (cellRect.left < containerLeft) {
          container.scrollLeft = container.scrollLeft + (cellRect.left - containerLeft)
        } else if (cellRect.right > containerRight) {
          container.scrollLeft = container.scrollLeft + (cellRect.right - containerRight)
        }
      }
    },
    []
  )

  const focusCell = useCallback(
    (rowIndex: number, columnId: string, scrollDirection?: NavigationDirection) => {
      setFocusedCell({ rowIndex, columnId })
      setEditingCell(null)

      if (tabId) {
        updateTableOrigin(tabId, { rowIndex, columnId })
      }

      if (tableContainerRef.current && document.activeElement !== tableContainerRef.current) {
        tableContainerRef.current.focus()
      }

      onTableInteract?.()

      requestAnimationFrame(() => {
        scrollCellIntoView(rowIndex, columnId, scrollDirection)
      })
    },
    [onTableInteract, scrollCellIntoView, tabId, updateTableOrigin]
  )

  // Cell navigation handler - calculates new position based on direction and moves focus.
  // Handles all navigation directions: arrows, home/end, page up/down, ctrl+home/end.
  const navigateCellRef = useRef<(direction: NavigationDirection) => void>(null)

  navigateCellRef.current = (direction: NavigationDirection) => {
    const startPosition = origin || focusedCell
    if (!startPosition) return

    const { rowIndex, columnId } = startPosition
    const currentColIndex = navigableColumnIds.indexOf(columnId)
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
          const prevColumnId = navigableColumnIds[currentColIndex - 1]
          if (prevColumnId) newColumnId = prevColumnId
        }
        break
      case 'right':
        if (currentColIndex < navigableColumnIds.length - 1) {
          const nextColumnId = navigableColumnIds[currentColIndex + 1]
          if (nextColumnId) newColumnId = nextColumnId
        }
        break
      case 'home':
        if (navigableColumnIds.length > 0) {
          newColumnId = navigableColumnIds[0] ?? columnId
        }
        break
      case 'end':
        if (navigableColumnIds.length > 0) {
          newColumnId = navigableColumnIds[navigableColumnIds.length - 1] ?? columnId
        }
        break
      case 'ctrl+home':
        newRowIndex = 0
        if (navigableColumnIds.length > 0) {
          newColumnId = navigableColumnIds[0] ?? columnId
        }
        break
      case 'ctrl+end':
        newRowIndex = Math.max(0, rowCount - 1)
        if (navigableColumnIds.length > 0) {
          newColumnId = navigableColumnIds[navigableColumnIds.length - 1] ?? columnId
        }
        break
      case 'pageup': {
        const container = tableContainerRef.current
        if (container) {
          const containerHeight = container.clientHeight
          const rowHeight = 40
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
          const rowHeight = 40
          const pageSize = Math.floor(containerHeight / rowHeight) || 10
          newRowIndex = Math.min(rowCount - 1, rowIndex + pageSize)
        } else {
          newRowIndex = Math.min(rowCount - 1, rowIndex + 10)
        }
        break
      }
    }

    if (newRowIndex !== rowIndex || newColumnId !== columnId) {
      focusCell(newRowIndex, newColumnId, direction)
    }
  }

  // Stable callback wrapper for cell navigation
  const navigateCell = useCallback((direction: NavigationDirection) => {
    navigateCellRef.current?.(direction)
  }, [])

  // Start editing a cell - sets both focused and editing state
  const onCellEditingStart = useCallback(
    (rowIndex: number, columnId: string) => {
      setFocusedCell({ rowIndex, columnId })
      setEditingCell({ rowIndex, columnId })
      onTableInteract?.()
    },
    [onTableInteract]
  )

  const onCellEditingStopRef =
    useRef<(opts?: { moveToNextRow?: boolean; direction?: NavigationDirection }) => void>(null)

  // Stop editing and optionally navigate:
  // - moveToNextRow: moves focus to the next row in the same column
  // - direction: navigates in the specified direction after stopping
  onCellEditingStopRef.current = (opts?: {
    moveToNextRow?: boolean
    direction?: NavigationDirection
  }) => {
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
  }

  const onCellEditingStop = useCallback(
    (opts?: { moveToNextRow?: boolean; direction?: NavigationDirection }) => {
      onCellEditingStopRef.current?.(opts)
    },
    []
  )

  // Stable table reference for use in callbacks to avoid stale closures
  const tableRef2 = useRef(table)
  tableRef2.current = table

  // Handle cell data updates - calls the provided onCellUpdate callback for single-cell changes
  const onDataUpdate = useCallback(
    (updates: UpdateCell | Array<UpdateCell>) => {
      const updateArray = Array.isArray(updates) ? updates : [updates]

      if (updateArray.length === 0) return

      if (onCellUpdate && updateArray.length === 1) {
        const update = updateArray[0]
        const rows = tableRef2.current.getRowModel().rows
        const row = rows[update.rowIndex]
        if (row) {
          const originalData = row.original as QueryResultRow
          onCellUpdate(update.columnId, update.value, originalData).catch((error) => {
            console.error('Failed to update cell:', error)
          })
        }
      }
    },
    [onCellUpdate, tableRef2]
  )

  // Single click focuses the cell (ignores right-click and select column)
  const onCellClick = useCallback(
    (rowIndex: number, columnId: string, event?: MouseEvent) => {
      if (event?.button === 2) return
      if (columnId === 'select') return
      focusCell(rowIndex, columnId)
    },
    [focusCell]
  )

  // Double click starts editing mode for the cell
  const onCellDoubleClick = useCallback(
    (rowIndex: number, columnId: string, event?: MouseEvent) => {
      if (event?.defaultPrevented) return
      onCellEditingStart(rowIndex, columnId)
    },
    [onCellEditingStart]
  )

  const onKeyDownRef = useRef<(event: KeyboardEvent) => void>(null)

  // Keyboard event handler for table navigation and cell actions:
  // - Ctrl+C: copy cell content
  // - Delete: clear cell value
  // - Backspace: enter edit mode
  // - Arrow keys: navigate cells
  // - Home/End: navigate to row start/end (Ctrl+ for table start/end)
  // - PageUp/PageDown: jump by visible page height
  // - Tab/Shift+Tab: move left/right
  // - Enter: start editing
  // - Escape: clear focus
  onKeyDownRef.current = (event: KeyboardEvent) => {
    const { key, ctrlKey, metaKey, shiftKey } = event
    const isCtrlPressed = ctrlKey || metaKey

    if (editingCell) return

    const currentPosition = focusedCell || origin
    if (!currentPosition) return

    let direction: NavigationDirection | null = null

    if (key === 'c' && isCtrlPressed) {
      if (currentPosition) {
        event.preventDefault()
        const rows = tableRef2.current.getRowModel().rows
        const row = rows[currentPosition.rowIndex]
        if (row) {
          const cellValue = row.getValue(currentPosition.columnId)
          const textValue = cellValue === null || cellValue === undefined ? '' : String(cellValue)
          navigator.clipboard
            .writeText(textValue)
            .then(() => {
              toast.success('Cell content copied to clipboard')
            })
            .catch((err) => {
              console.error('Failed to copy to clipboard:', err)
            })
        }
      }
      return
    }

    if (key === 'Delete') {
      if (currentPosition) {
        event.preventDefault()
        onDataUpdate({
          rowIndex: currentPosition.rowIndex,
          columnId: currentPosition.columnId,
          value: null
        })
      }
      return
    }

    if (key === 'Backspace') {
      if (currentPosition) {
        event.preventDefault()
        onCellEditingStart(currentPosition.rowIndex, currentPosition.columnId)
      }
      return
    }

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
        setFocusedCell(null)
        setEditingCell(null)
        return
      case 'Tab':
        event.preventDefault()
        direction = shiftKey ? 'left' : 'right'
        break
      case 'Enter':
        if (currentPosition) {
          event.preventDefault()
          onCellEditingStart(currentPosition.rowIndex, currentPosition.columnId)
        }
        return
    }

    if (direction) {
      event.preventDefault()
      navigateCell(direction)
    }
  }

  // Attach keydown listener to the table container for navigation and cell actions.
  useEffect(() => {
    const container = tableContainerRef.current
    if (!container) return

    const handleKeyDown = (event: KeyboardEvent) => {
      onKeyDownRef.current?.(event)
    }

    container.addEventListener('keydown', handleKeyDown)

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Clear focus and editing state when clicking outside the table container.
  useEffect(() => {
    const container = tableContainerRef.current
    if (!container) return

    const handleClickOutside = (event: globalThis.MouseEvent) => {
      const target = event.target as Node
      if (!container.contains(target)) {
        setFocusedCell(null)
        setEditingCell(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const focusedCellRef = useRef(focusedCell)
  const originRef = useRef(origin)
  const navigableColumnIdsRef = useRef(navigableColumnIds)
  const dataLengthRef = useRef(data.length)

  focusedCellRef.current = focusedCell
  originRef.current = origin
  navigableColumnIdsRef.current = navigableColumnIds
  dataLengthRef.current = data.length

  // Global arrow key listener: auto-focuses the table when arrow keys are pressed
  // (unless focus is on an input, dialog, menu, etc.) and triggers navigation.
  useEffect(() => {
    const container = tableContainerRef.current
    if (!container) return

    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (!ARROW_KEYS.has(event.key)) return
      if (document.activeElement === container) return

      const activeElement = document.activeElement as HTMLElement | null
      if (
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.isContentEditable ||
        activeElement?.closest('[role="dialog"]') ||
        activeElement?.closest('[role="menu"]') ||
        activeElement?.closest('[role="listbox"]') ||
        activeElement?.closest('[data-radix-popper-content-wrapper]')
      ) {
        return
      }

      event.preventDefault()
      container.focus()

      const currentPosition = focusedCellRef.current || originRef.current
      const hasData = dataLengthRef.current > 0
      const hasColumns = navigableColumnIdsRef.current.length > 0
      if (!currentPosition && hasData && hasColumns) {
        const firstColumnId = navigableColumnIdsRef.current[0]
        if (firstColumnId) {
          focusCell(0, firstColumnId)
          return
        }
      }

      onKeyDownRef.current?.(event)
    }

    window.addEventListener('keydown', handleGlobalKeyDown)

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown)
    }
  }, [focusCell])

  return {
    table,
    tableContainerRef,
    rowMapRef,
    focusedCell,
    editingCell,
    columnSizing,
    columnIds,
    onCellClick,
    onCellDoubleClick,
    onCellEditingStart,
    onCellEditingStop,
    onDataUpdate
  }
}
