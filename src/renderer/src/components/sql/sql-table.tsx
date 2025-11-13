import { useTableData } from '@renderer/api/queries/schema'

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

  console.log(tableData)

  if (isLoadingTableData) {
    return <div>Loading table data...</div>
  }

  if (!tableData || error) {
    return <div>Table not found</div>
  }

  return <div>SqlTable</div>
}
