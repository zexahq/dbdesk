'use client'

import * as React from 'react'
import { type ColumnDef, flexRender } from '@tanstack/react-table'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@renderer/components/ui/table'
import { ColumnResizer } from './column-resizer'
import { cn } from '@renderer/lib/utils'
import { useDataTable } from '@renderer/hooks/use-data-table'
import { DataTableKeyboardShortcuts } from './data-table-keyboard-shortcuts'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onDataChange?: (data: TData[]) => void
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onDataChange
}: DataTableProps<TData, TValue>) {
  const {
    table,
    tableContainerRef,
    focusedCell,
    selectionState,
    getIsCellSelected,
    onCellClick,
    onCellDoubleClick,
    onCellMouseDown,
    onCellMouseEnter,
    onCellMouseUp
  } = useDataTable({
    columns,
    data,
    onDataChange
  })

  const rowModel = table.getRowModel()
  const rows = rowModel.rows
  const hasRows = rows.length > 0

  // Get column IDs for determining selection edges
  const columnIds = React.useMemo(() => {
    return table.getAllColumns().map((col) => col.id)
  }, [table])

  // Helper to determine if a cell is at the edge of the selection
  const getCellEdgeClasses = React.useCallback(
    (rowIndex: number, columnId: string) => {
      if (!selectionState.selectionRange || selectionState.selectedCells.size === 0) {
        return { edgeClasses: '', isEdgeCell: false }
      }

      const { start, end } = selectionState.selectionRange
      const startColIndex = columnIds.indexOf(start.columnId)
      const endColIndex = columnIds.indexOf(end.columnId)
      const currentColIndex = columnIds.indexOf(columnId)

      const minRow = Math.min(start.rowIndex, end.rowIndex)
      const maxRow = Math.max(start.rowIndex, end.rowIndex)
      const minCol = Math.min(startColIndex, endColIndex)
      const maxCol = Math.max(startColIndex, endColIndex)

      // Check if this cell is part of the selection
      const isInSelection =
        rowIndex >= minRow &&
        rowIndex <= maxRow &&
        currentColIndex >= minCol &&
        currentColIndex <= maxCol

      if (!isInSelection) {
        return { edgeClasses: '', isEdgeCell: false }
      }

      const isTopEdge = rowIndex === minRow
      const isBottomEdge = rowIndex === maxRow
      const isLeftEdge = currentColIndex === minCol
      const isRightEdge = currentColIndex === maxCol
      const isEdgeCell = isTopEdge || isBottomEdge || isLeftEdge || isRightEdge

      const edgeClasses: string[] = []

      if (isTopEdge) edgeClasses.push('border-t-2 border-t-ring')
      if (isBottomEdge) edgeClasses.push('border-b-2 border-b-ring')
      if (isLeftEdge) edgeClasses.push('border-l-2 border-l-ring')
      if (isRightEdge) edgeClasses.push('border-r-2 border-r-ring')

      edgeClasses.push('bg-ring/5')

      return { edgeClasses: edgeClasses.join(' '), isEdgeCell }
    },
    [selectionState, columnIds]
  )

  return (
    <>
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="relative flex-1 min-h-0">
          <div
            ref={tableContainerRef}
            className="h-full overflow-auto focus:outline-none"
            tabIndex={0}
          >
            <Table
              className="border-collapse table-fixed w-full!"
              style={{ width: table.getTotalSize() }}
            >
              <TableHeader className="sticky top-0">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const name =
                        (header.column.columnDef as { meta?: { name: string } }).meta?.name ?? ''

                      return (
                        <TableHead
                          key={header.id}
                          className="relative border-border border-x border-b first:border-l last:border-r truncate bg-background"
                          style={{
                            width: header.getSize(),
                            maxWidth: header.getSize()
                          }}
                          title={header.isPlaceholder ? undefined : String(name)}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                          <ColumnResizer header={header} />
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody className="[&_tr:last-child]:border-b">
                {hasRows
                  ? rows.map((row, rowIndex) => {
                      const isRowSelected = row.getIsSelected()
                      return (
                        <TableRow
                          key={row.id}
                          data-state={isRowSelected && 'selected'}
                          className={cn(isRowSelected && 'bg-selected-cell')}
                        >
                          {row.getVisibleCells().map((cell) => {
                            const columnId = cell.column.id
                            const isSelectColumn = columnId === 'select'
                            const isFocused =
                              focusedCell?.rowIndex === rowIndex &&
                              focusedCell?.columnId === columnId
                            const isSelected = getIsCellSelected(rowIndex, columnId)
                            const { edgeClasses, isEdgeCell } = getCellEdgeClasses(
                              rowIndex,
                              columnId
                            )
                            const hasSelectionBorder = isEdgeCell

                            return (
                              <TableCell
                                key={cell.id}
                                className={cn(
                                  // Default borders - remove on edge cells that are part of selection
                                  !hasSelectionBorder &&
                                    'border-border border-x first:border-l last:border-r',
                                  'truncate bg-accent/50',
                                  !isSelectColumn && 'cursor-pointer',
                                  // Only show outline on focused cell if there's no selection border
                                  isFocused &&
                                    !hasSelectionBorder &&
                                    'outline-2 outline-ring outline-offset-0',
                                  isSelected && !isFocused && !isRowSelected && 'bg-selected-cell',
                                  edgeClasses
                                )}
                                style={{
                                  width: cell.column.getSize(),
                                  minWidth: cell.column.columnDef.minSize,
                                  maxWidth: cell.column.getSize()
                                }}
                                title={String(cell.getValue() ?? '')}
                                onClick={
                                  isSelectColumn
                                    ? undefined
                                    : (e) => onCellClick(rowIndex, columnId, e)
                                }
                                onDoubleClick={
                                  isSelectColumn
                                    ? undefined
                                    : (e) => onCellDoubleClick(rowIndex, columnId, e)
                                }
                                onMouseDown={
                                  isSelectColumn
                                    ? undefined
                                    : (e) => onCellMouseDown(rowIndex, columnId, e)
                                }
                                onMouseEnter={
                                  isSelectColumn
                                    ? undefined
                                    : (e) => onCellMouseEnter(rowIndex, columnId, e)
                                }
                                onMouseUp={isSelectColumn ? undefined : onCellMouseUp}
                              >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      )
                    })
                  : null}
              </TableBody>
            </Table>
          </div>
          {!hasRows ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="rounded border border-dashed bg-background/80 px-4 py-2 text-sm text-muted-foreground">
                No data available
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <DataTableKeyboardShortcuts />
    </>
  )
}
