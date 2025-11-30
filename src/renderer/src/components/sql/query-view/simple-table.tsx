'use client'

import type { QueryResultRow } from '@common/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@renderer/components/ui/table'
import { formatCellValue } from '@renderer/lib/data-table'
import { cn } from '@renderer/lib/utils'
import type { CellPosition } from '@renderer/types/data-table'
import {
  type ColumnDef,
  type ColumnSizingState,
  flexRender,
  getCoreRowModel,
  useReactTable
} from '@tanstack/react-table'
import { useState } from 'react'
import { ColumnResizer } from '../table/column-resizer'

interface SimpleTableProps {
  columns: string[]
  data: QueryResultRow[]
}

const DEFAULT_COLUMN_WIDTH = 200

function getSimpleColumns(columnNames: string[]): ColumnDef<QueryResultRow>[] {
  return columnNames.map((columnName) => ({
    id: columnName,
    accessorKey: columnName,
    header: () => (
      <div className="px-2 py-1">
        <span className="font-medium text-accent-foreground">{columnName}</span>
      </div>
    ),
    cell: ({ getValue }) => {
      const value = getValue()
      const formattedValue = formatCellValue(value, undefined)
      const isNull = value === null
      return (
        <span className={cn('truncate', isNull && 'text-muted-foreground')}>{formattedValue}</span>
      )
    },
    size: DEFAULT_COLUMN_WIDTH,
    minSize: 100
  }))
}

export function SimpleTable({ columns, data }: SimpleTableProps) {
  const tableColumns = getSimpleColumns(columns)
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({})
  const [focusedCell, setFocusedCell] = useState<CellPosition | null>(null)

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    state: {
      columnSizing
    },
    onColumnSizingChange: setColumnSizing
  })

  const rowModel = table.getRowModel()
  const rows = rowModel.rows
  const hasRows = rows.length > 0

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="relative flex-1 min-h-0">
        <div className="h-full overflow-auto">
          <Table
            className="border-collapse table-fixed w-full!"
            style={{ width: table.getTotalSize() }}
          >
            <TableHeader className="sticky top-0 z-10 shadow-sm">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="bg-muted">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="relative border-border border-x border-b-2 first:border-l last:border-r truncate bg-muted"
                      style={{
                        width: header.getSize(),
                        maxWidth: header.getSize()
                      }}
                      title={header.isPlaceholder ? undefined : String(header.id)}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      <ColumnResizer header={header} />
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody className="[&_tr:last-child]:border-b">
              {hasRows
                ? rows.map((row, rowIndex) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => {
                        const columnId = cell.column.id
                        const isFocused =
                          focusedCell?.rowIndex === rowIndex && focusedCell?.columnId === columnId
                        return (
                          <TableCell
                            key={cell.id}
                            className={cn(
                              'border-border border-x truncate cursor-pointer',
                              isFocused && 'outline-2 outline-ring outline-offset-0'
                            )}
                            style={{
                              width: cell.column.getSize(),
                              maxWidth: cell.column.getSize()
                            }}
                            onClick={() => setFocusedCell({ rowIndex, columnId })}
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
  )
}
