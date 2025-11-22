'use client'

import { type ColumnDef, flexRender } from '@tanstack/react-table'

import { Table, TableBody, TableHead, TableHeader, TableRow } from '@renderer/components/ui/table'
import { useDataTable } from '@renderer/hooks/use-data-table'
import { cn } from '@renderer/lib/utils'
import { ColumnResizer } from './column-resizer'
import { DataTableCell } from './data-table-cell'
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
    rowMapRef,
    focusedCell,
    editingCell,
    getIsCellSelected,
    getCellEdgeClasses,
    onCellClick,
    onCellDoubleClick,
    onCellMouseDown,
    onCellMouseEnter,
    onCellMouseUp,
    onCellEditingStop,
    onDataUpdate
  } = useDataTable({
    columns,
    data,
    onDataChange
  })

  const rowModel = table.getRowModel()
  const rows = rowModel.rows
  const hasRows = rows.length > 0

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
              <TableHeader className="sticky top-0 z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="bg-background">
                    {headerGroup.headers.map((header) => {
                      const name =
                        (header.column.columnDef as { meta?: { name: string } }).meta?.name ?? ''

                      return (
                        <TableHead
                          key={header.id}
                          className="relative border-border border-x border-b-2 first:border-l last:border-r truncate bg-background"
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
                          ref={(el) => {
                            if (el) {
                              rowMapRef.current.set(rowIndex, el)
                            } else {
                              rowMapRef.current.delete(rowIndex)
                            }
                          }}
                          data-state={isRowSelected && 'selected'}
                          className={cn(isRowSelected && 'bg-selected-cell')}
                        >
                          {row.getVisibleCells().map((cell) => {
                            const columnId = cell.column.id

                            return (
                              <DataTableCell
                                key={cell.id}
                                cell={cell}
                                rowIndex={rowIndex}
                                columnId={columnId}
                                isRowSelected={isRowSelected}
                                focusedCell={focusedCell}
                                editingCell={editingCell}
                                getIsCellSelected={getIsCellSelected}
                                getCellEdgeClasses={getCellEdgeClasses}
                                onCellClick={onCellClick}
                                onCellDoubleClick={onCellDoubleClick}
                                onCellMouseDown={onCellMouseDown}
                                onCellMouseEnter={onCellMouseEnter}
                                onCellMouseUp={onCellMouseUp}
                                onCellEditingStop={onCellEditingStop}
                                onDataUpdate={onDataUpdate}
                                tableContainerRef={tableContainerRef}
                              />
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
