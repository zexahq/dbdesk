import { useTableData } from '@renderer/api/queries/schema'
import { getColumns } from './columns'
import { DataTable } from './data-table'
import { normalizeRow } from '@renderer/lib/utils'

interface SqlTableProps {
  connectionId: string
  schema: string
  table: string
}

export const SqlTable = ({ connectionId, schema, table }: SqlTableProps) => {
  const {
    data: tableData,
    isLoading: isLoadingTableData,
    error
  } = useTableData(connectionId, schema, table)

  if (isLoadingTableData) {
    return <div>Loading table data...</div>
  }

  if (!tableData || error) {
    return <div>Table not found</div>
  }

  const columns = getColumns(tableData.columns)
  const rows = tableData.rows.map((row) => {
    const normalizedRow = normalizeRow(row)

    return tableData.columns.reduce<Record<string, string>>((acc, column) => {
      if (!(column in acc)) {
        acc[column] = ''
      }

      return acc
    }, normalizedRow)
  })

  return (
    <div className="flex h-full flex-col">
      <DataTable columns={columns} data={rows} />
    </div>
  )
}
