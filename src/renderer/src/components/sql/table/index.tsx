import { TableDataResult } from '@renderer/api/client'
import { getColumns } from './columns'
import { DataTable } from './data-table'

interface SqlTableProps {
  isLoading: boolean
  error: Error | null
  tableData?: TableDataResult
}

export const SqlTable = ({ isLoading, error, tableData }: SqlTableProps) => {
  if (isLoading) {
    return <div>Loading table data...</div>
  }

  if (!tableData || error) {
    return <div>Table not found</div>
  }

  const columns = getColumns(tableData.columns)

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex-1 overflow-hidden min-h-0">
        <DataTable columns={columns} data={tableData.rows} />
      </div>
    </div>
  )
}
