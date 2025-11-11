import { useTableIntrospection } from '@renderer/api/queries/schema'

interface SqlTableProps {
  connectionId: string
  schema: string
  table: string
}

export const SqlTable = ({ connectionId, schema, table }: SqlTableProps) => {
  const {
    data: tableInfo,
    isLoading: isLoadingTableInfo,
    error
  } = useTableIntrospection(connectionId, schema, table)

  if (isLoadingTableInfo) {
    return <div>Loading table info...</div>
  }

  if (!tableInfo || error) {
    return <div>Table not found</div>
  }

  return <div>SqlTable</div>
}
