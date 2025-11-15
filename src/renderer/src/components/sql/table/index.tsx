import { TableDataResult } from '@renderer/api/client'
import { getColumns } from './columns'
import { DataTable } from './data-table'
import { normalizeRow } from '@renderer/lib/utils'

interface SqlTableProps {
  isLoading: boolean
  error: Error | null
  tableData?: TableDataResult
  onSelectedRowsCountChange: (count: number) => void
}

export const SqlTable = ({
  isLoading,
  error,
  tableData,
  onSelectedRowsCountChange
}: SqlTableProps) => {
  if (isLoading) {
    return <div>Loading table data...</div>
  }

  if (!tableData || error) {
    return <div>Table not found</div>
  }

  const columns = getColumns(tableData.columns)
  const rows = tableData.rows.map((row) => {
    const normalizedRow = normalizeRow(row)

    return tableData.columns.reduce<Record<string, string>>((acc, column) => {
      const columnName = column.name
      if (!(columnName in acc)) {
        acc[columnName] = ''
      }

      return acc
    }, normalizedRow)
  })

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex-1 overflow-hidden min-h-0">
        <DataTable
          columns={columns}
          data={rows}
          onSelectedRowsCountChange={onSelectedRowsCountChange}
        />
      </div>
    </div>
  )
}
