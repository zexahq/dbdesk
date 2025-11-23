import { QueryResultRow, TableDataResult } from '@renderer/api/client'
import { getColumns } from './columns'
import { DataTable } from './data-table'

interface SqlTableProps {
  tabId: string
  isLoading: boolean
  error: Error | null
  tableData?: TableDataResult
  onCellUpdate?: (columnToUpdate: string, newValue: unknown, row: QueryResultRow) => Promise<void>
}

export const SqlTable = ({ tabId, isLoading, error, tableData, onCellUpdate }: SqlTableProps) => {
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

  const columns = getColumns(tableData.columns)

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex-1 overflow-hidden min-h-0">
        <DataTable
          tabId={tabId}
          columns={columns}
          data={tableData.rows}
          onCellUpdate={onCellUpdate}
        />
      </div>
    </div>
  )
}
