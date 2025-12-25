import { QueryResultRow, TableDataResult } from '@renderer/api/client'
import type { OnChangeFn, RowSelectionState, VisibilityState } from '@tanstack/react-table'
import * as React from 'react'
import { getColumns } from './columns'
import { DataTable } from './data-table'

interface SqlTableProps {
  isLoading: boolean
  error: Error | null
  tableData?: TableDataResult
  onCellUpdate?: (columnToUpdate: string, newValue: unknown, row: QueryResultRow) => Promise<void>
  rowSelection: RowSelectionState
  onRowSelectionChange: OnChangeFn<RowSelectionState>
  columnVisibility: VisibilityState
  onColumnVisibilityChange: OnChangeFn<VisibilityState>
}

export const SqlTable = ({
  isLoading,
  error,
  tableData,
  onCellUpdate,
  rowSelection,
  onRowSelectionChange,
  columnVisibility,
  onColumnVisibilityChange
}: SqlTableProps) => {
  // Memoize columns to prevent recreation on every render
  const columns = React.useMemo(() => {
    if (!tableData) return []
    return getColumns(tableData.columns)
  }, [tableData])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium">Loading table data...</p>
        </div>
      </div>
    )
  }

  if (!tableData || error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium">Table not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex-1 overflow-hidden min-h-0">
        <DataTable
          columns={columns}
          data={tableData.rows}
          onCellUpdate={onCellUpdate}
          rowSelection={rowSelection}
          onRowSelectionChange={onRowSelectionChange}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={onColumnVisibilityChange}
        />
      </div>
    </div>
  )
}
