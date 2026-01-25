import type { TableSortRule } from '@common/types'
import { QueryResultRow, TableDataResult } from '@renderer/api/client'
import { useTabStore } from '@renderer/store/tab-store'
import type { OnChangeFn, RowSelectionState } from '@tanstack/react-table'
import * as React from 'react'
import { getColumns } from './columns'
import { DataTable } from './data-table'

interface SqlTableProps {
  isLoading: boolean
  error: Error | null
  tableData?: TableDataResult
  onCellUpdate?: (columnToUpdate: string, newValue: unknown, row: QueryResultRow) => Promise<void>
  onTableInteract?: () => void
  rowSelection: RowSelectionState
  onRowSelectionChange: OnChangeFn<RowSelectionState>
  tabId?: string
  sortRules?: TableSortRule[]
}

export const SqlTable = ({
  isLoading,
  error,
  tableData,
  onCellUpdate,
  onTableInteract,
  rowSelection,
  onRowSelectionChange,
  tabId,
  sortRules
}: SqlTableProps) => {
  const updateTableTab = useTabStore((s) => s.updateTableTab)

  // Memoize columns to prevent recreation on every render
  const columns = React.useMemo(() => {
    if (!tableData || !tabId) return []
    return getColumns(tableData.columns, (nextSortRules) => {
      updateTableTab(tabId, { sortRules: nextSortRules, offset: 0 })
    })
  }, [tableData, tabId, updateTableTab])

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
          onTableInteract={onTableInteract}
          rowSelection={rowSelection}
          onRowSelectionChange={onRowSelectionChange}
          sortRules={sortRules}
          tabId={tabId}
        />
      </div>
    </div>
  )
}
