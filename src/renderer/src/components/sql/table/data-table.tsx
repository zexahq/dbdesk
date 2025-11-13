'use client'

import {
  type ColumnDef,
  type ColumnSizingState,
  flexRender,
  getCoreRowModel,
  useReactTable
} from '@tanstack/react-table'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@renderer/components/ui/table'
import { ColumnResizer } from './column-resizer'
import { useState } from 'react'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
}

export function DataTable<TData, TValue>({ columns, data }: DataTableProps<TData, TValue>) {
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({})

  const table = useReactTable({
    data,
    columns,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    getCoreRowModel: getCoreRowModel(),
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
          <Table className="border-collapse table-fixed" style={{ width: table.getTotalSize() }}>
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
                          header.isPlaceholder ? undefined : String(header.column.columnDef.header)
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
                ? rows.map((row) => (
                    <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className="border-border border-x first:border-l last:border-r truncate"
                          style={{
                            width: cell.column.getSize(),
                            minWidth: cell.column.columnDef.minSize,
                            maxWidth: cell.column.getSize()
                          }}
                          title={String(cell.getValue() ?? '')}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
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
