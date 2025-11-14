'use client'

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
                      return (
                        <TableHead
                          key={header.id}
                          className="relative border-border border-x first:border-l last:border-r bg-muted text-muted-foreground truncate"
                          style={{
                            width: header.getSize(),
                            maxWidth: header.getSize()
                          }}
                          title={
                            header.isPlaceholder
                              ? undefined
                              : String(header.column.columnDef.header)
                          }
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
                  ? rows.map((row, rowIndex) => (
                      <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                        {row.getVisibleCells().map((cell) => {
                          const columnId =
                            cell.column.id ||
                            ((cell.column.columnDef as { accessorKey?: string })
                              .accessorKey as string) ||
                            ''
                          const isFocused =
                            focusedCell?.rowIndex === rowIndex && focusedCell?.columnId === columnId
                          const isSelected = getIsCellSelected(rowIndex, columnId)

                          return (
                            <TableCell
                              key={cell.id}
                              className={cn(
                                'border-border border-x first:border-l last:border-r truncate cursor-pointer',
                                isFocused && 'outline-1 outline-primary outline-offset-0',
                                isSelected && !isFocused && 'bg-selected-cell'
                              )}
                              style={{
                                width: cell.column.getSize(),
                                minWidth: cell.column.columnDef.minSize,
                                maxWidth: cell.column.getSize()
                              }}
                              title={String(cell.getValue() ?? '')}
                              onClick={(e) => onCellClick(rowIndex, columnId, e)}
                              onDoubleClick={(e) => onCellDoubleClick(rowIndex, columnId, e)}
                              onMouseDown={(e) => onCellMouseDown(rowIndex, columnId, e)}
                              onMouseEnter={(e) => onCellMouseEnter(rowIndex, columnId, e)}
                              onMouseUp={onCellMouseUp}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))
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
