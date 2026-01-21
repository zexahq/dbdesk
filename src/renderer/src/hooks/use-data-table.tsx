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

  // All state is local - no Zustand syncing for ephemeral UI state
  const [focusedCell, setFocusedCell] = useState<CellPosition | null>(null)
  const [editingCell, setEditingCell] = useState<CellPosition | null>(null)
  const [columnSizing, setColumnSizing] = useState<Record<string, number>>({})

  // Get column IDs
  const columnIds = useMemo(() => {
    return columns
      .map((c) => {
        if (c.id) return c.id
        if ('accessorKey' in c) return c.accessorKey as string
        return undefined
      })
      .filter((id): id is string => Boolean(id))
  }, [columns])

  // Get navigable column IDs (exclude select and actions columns)
  const navigableColumnIds = useMemo(() => {
    return columnIds.filter((c) => !NON_NAVIGABLE_COLUMN_IDS.includes(c))
  }, [columnIds])

  // Track if we've initialized the origin for this tab
  const hasInitializedOrigin = useRef(false)

  // Initialize origin on first render or when data changes
  useEffect(() => {
    if (data.length > 0 && navigableColumnIds.length > 0 && tabId) {
      if (!origin && !hasInitializedOrigin.current) {
        // Initialize origin to first navigable cell
        const firstColumnId = navigableColumnIds[0]
        if (firstColumnId) {
          hasInitializedOrigin.current = true
          const newOrigin = { rowIndex: 0, columnId: firstColumnId }
          updateTableOrigin(tabId, newOrigin)
          setFocusedCell(newOrigin)
        }
      } else if (origin) {
        // Validate origin is within bounds before restoring
        const isValidRow = origin.rowIndex < data.length
        const isValidColumn = navigableColumnIds.includes(origin.columnId)

        if (isValidRow && isValidColumn) {
          // Only update focusedCell if it differs from origin (avoid unnecessary re-renders)
          setFocusedCell((prev) => {
            if (prev?.rowIndex === origin.rowIndex && prev?.columnId === origin.columnId) {
              return prev
            }
            return origin
          })
        } else {
          // Reset to first valid cell if origin is out of bounds
          const firstColumnId = navigableColumnIds[0]
          if (firstColumnId) {
            const validOrigin = {
              rowIndex: Math.min(origin.rowIndex, data.length - 1),
              columnId: isValidColumn ? origin.columnId : firstColumnId
            }
            updateTableOrigin(tabId, validOrigin)
            setFocusedCell(validOrigin)
          }
        }
      }
    }
  }, [data.length, navigableColumnIds, origin, tabId, updateTableOrigin])

  // Reset initialization flag when tabId changes
  useEffect(() => {
    hasInitializedOrigin.current = false
  }, [tabId])

  // Clear origin when data becomes empty
  useEffect(() => {
    if (data.length === 0 && tabId && origin) {
      setFocusedCell(null)
    }
  }, [data.length, tabId, origin])

  // Handle row selection change (keep separate from cell selection)
  const handleRowSelectionChange = useCallback(
    (updater: Updater<RowSelectionState>) => {
      const newSelection = typeof updater === 'function' ? updater(rowSelection) : updater
      onRowSelectionChange(newSelection)
    },
    [rowSelection, onRowSelectionChange]
  )

  // Table instance
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

  // Scroll cell into view
  const scrollCellIntoView = useCallback(
    (rowIndex: number, columnId: string, direction?: NavigationDirection) => {
      const container = tableContainerRef.current
      if (!container) return

      const rowElement = rowMapRef.current.get(rowIndex)
      if (!rowElement) {
        // If row is not rendered yet, try to scroll to approximate position
        // This is a fallback for when rows are not in the DOM
        const headerElement = container.querySelector('thead')
        const headerHeight = headerElement?.getBoundingClientRect().height ?? 0
        const approximateRowHeight = 40 // Approximate row height
        const targetScrollTop = rowIndex * approximateRowHeight

        // Only scroll if the target is outside the viewport
        const viewportTop = container.scrollTop + headerHeight
        const viewportBottom = container.scrollTop + container.clientHeight

        if (targetScrollTop < viewportTop) {
          // Scroll to show row at top
          container.scrollTop = Math.max(0, targetScrollTop - headerHeight)
        } else if (targetScrollTop + approximateRowHeight > viewportBottom) {
          // Scroll to show row at bottom
          container.scrollTop = targetScrollTop + approximateRowHeight - container.clientHeight
        }
        return
      }

      // Row is rendered, use scrollIntoView or manual calculation
      const headerElement = container.querySelector('thead')
      const headerHeight = headerElement?.getBoundingClientRect().height ?? 0
      const containerRect = container.getBoundingClientRect()

      // Calculate viewport boundaries relative to the container's scroll position
      const viewportTop = container.scrollTop + headerHeight
      const viewportBottom = container.scrollTop + container.clientHeight

      // Calculate row position relative to container's scroll position
      const rowTop = rowElement.offsetTop
      const rowBottom = rowTop + rowElement.offsetHeight

      // Check if row is fully visible
      const isFullyVisible = rowTop >= viewportTop && rowBottom <= viewportBottom

      if (isFullyVisible) {
        // Row is already visible, but we might need to scroll horizontally for the column
        // Find the cell element and scroll it horizontally if needed
        const cellElement = rowElement.querySelector(
          `[data-column-id="${columnId}"]`
        ) as HTMLElement
        if (cellElement) {
          const cellRect = cellElement.getBoundingClientRect()
          const containerLeft = containerRect.left
          const containerRight = containerRect.right

          if (cellRect.left < containerLeft) {
            // Cell is to the left of viewport, scroll left
            container.scrollLeft = container.scrollLeft + (cellRect.left - containerLeft)
          } else if (cellRect.right > containerRight) {
            // Cell is to the right of viewport, scroll right
            container.scrollLeft = container.scrollLeft + (cellRect.right - containerRight)
          }
        }
        return
      }

      // Row is not fully visible, scroll it into view
      if (direction === 'down' || direction === 'pagedown' || direction === 'ctrl+end') {
        // For downward navigation, align to bottom
        const scrollNeeded = rowBottom - viewportBottom
        if (scrollNeeded > 0) {
          container.scrollTop += scrollNeeded
        }
      } else if (direction === 'up' || direction === 'pageup' || direction === 'ctrl+home') {
        // For upward navigation, align to top
        const scrollNeeded = viewportTop - rowTop
        if (scrollNeeded > 0) {
          container.scrollTop -= scrollNeeded
        }
      } else {
        // For other directions (left, right, home, end), center the row
        const rowCenter = rowTop + rowElement.offsetHeight / 2
        const viewportCenter = viewportTop + (viewportBottom - viewportTop) / 2
        const scrollNeeded = rowCenter - viewportCenter
        container.scrollTop += scrollNeeded
      }

      // Also handle horizontal scrolling for the column
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

  // Focus cell
  const focusCell = useCallback(
    (rowIndex: number, columnId: string, scrollDirection?: NavigationDirection) => {
      setFocusedCell({ rowIndex, columnId })
      setEditingCell(null)

      // Update origin to current focused cell
      if (tabId) {
        updateTableOrigin(tabId, { rowIndex, columnId })
      }

      // Focus the container if needed
      if (tableContainerRef.current && document.activeElement !== tableContainerRef.current) {
        tableContainerRef.current.focus()
      }

      // Notify parent about table interaction
      onTableInteract?.()

      // Scroll cell into view after a brief delay to ensure DOM is updated
      requestAnimationFrame(() => {
        scrollCellIntoView(rowIndex, columnId, scrollDirection)
      })
    },
    [onTableInteract, scrollCellIntoView, tabId, updateTableOrigin]
  )

  // Navigate cell - use refs for state to avoid recreating callback
  const navigateCellRef = useRef<(direction: NavigationDirection) => void>(null)

  navigateCellRef.current = (direction: NavigationDirection) => {
    // Use origin as the starting point, or focusedCell as fallback
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
      focusCell(newRowIndex, newColumnId, direction)
    }
  }

  const navigateCell = useCallback((direction: NavigationDirection) => {
    navigateCellRef.current?.(direction)
  }, [])

  // Start editing cell
  const onCellEditingStart = useCallback(
    (rowIndex: number, columnId: string) => {
      setFocusedCell({ rowIndex, columnId })
      setEditingCell({ rowIndex, columnId })
      onTableInteract?.()
    },
    [onTableInteract]
  )

  // Stop editing cell - use ref to avoid stale closure
  const onCellEditingStopRef =
    useRef<(opts?: { moveToNextRow?: boolean; direction?: NavigationDirection }) => void>(null)

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

  // Handle data updates - use ref to avoid table dependency
  const tableRef2 = useRef(table)
  tableRef2.current = table

  const onDataUpdate = useCallback(
    (updates: UpdateCell | Array<UpdateCell>) => {
      const updateArray = Array.isArray(updates) ? updates : [updates]

      if (updateArray.length === 0) return

      // If onCellUpdate is provided and this is a single cell update, call it
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

  // Handle cell click - only focuses, never starts editing
  const onCellClick = useCallback(
    (rowIndex: number, columnId: string, event?: MouseEvent) => {
      // Ignore right-click
      if (event?.button === 2) {
        return
      }

      // Ignore clicks on select column (let checkbox handle it)
      if (columnId === 'select') {
        return
      }

      // Always just focus on single click, never start editing
      focusCell(rowIndex, columnId)
    },
    [focusCell]
  )

  // Handle cell double click - starts editing
  const onCellDoubleClick = useCallback(
    (rowIndex: number, columnId: string, event?: MouseEvent) => {
      if (event?.defaultPrevented) return
      onCellEditingStart(rowIndex, columnId)
    },
    [onCellEditingStart]
  )

  // Handle keyboard events - use refs to get latest state
  const onKeyDownRef = useRef<(event: KeyboardEvent) => void>(null)

  onKeyDownRef.current = (event: KeyboardEvent) => {
    const { key, ctrlKey, metaKey, shiftKey } = event
    const isCtrlPressed = ctrlKey || metaKey

    if (editingCell) return

    // Check if we have a position to navigate from (either focusedCell or origin)
    const currentPosition = focusedCell || origin
    if (!currentPosition) return

    let direction: NavigationDirection | null = null

    // Ctrl+C to copy focused cell content
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

    // Delete to clear focused cell value
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

    // Backspace to enter editing mode
    if (key === 'Backspace') {
      if (currentPosition) {
        event.preventDefault()
        onCellEditingStart(currentPosition.rowIndex, currentPosition.columnId)
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
        setFocusedCell(null)
        setEditingCell(null)
        return
      case 'Tab':
        event.preventDefault()
        direction = shiftKey ? 'left' : 'right'
        break
      case 'Enter':
        if (!editingCell && currentPosition) {
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

  // Set up keyboard event listeners
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

  // Clear focus when clicking outside the table
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

  // Auto-focus table container on arrow key press (global listener)
  // Use refs to access latest state without recreating the effect
  const focusedCellRef = useRef(focusedCell)
  const originRef = useRef(origin)
  const navigableColumnIdsRef = useRef(navigableColumnIds)
  const dataLengthRef = useRef(data.length)

  focusedCellRef.current = focusedCell
  originRef.current = origin
  navigableColumnIdsRef.current = navigableColumnIds
  dataLengthRef.current = data.length

  useEffect(() => {
    const container = tableContainerRef.current
    if (!container) return

    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      // Only handle arrow keys
      if (!ARROW_KEYS.has(event.key)) return

      // Skip if already focused on the table container
      if (document.activeElement === container) return

      // Skip if focus is on an input, textarea, or other editable element
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

      // Prevent default scroll behavior and handle the event ourselves
      event.preventDefault()

      // Focus the table container
      container.focus()

      // If there's no current position, initialize focus to the first cell
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

      // Manually trigger the keyboard handler since the event won't re-dispatch
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
