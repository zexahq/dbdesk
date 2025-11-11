import { useQuery } from '@tanstack/react-query'
import { dbdeskClient } from '../../api/client'
import type { TableInfo } from '@common/types'

const keys = {
  schemas: (connectionId: string) => ['schemas', connectionId] as const,
  tables: (connectionId: string, schema: string) => ['tables', connectionId, schema] as const,
  tableInfo: (connectionId: string, schema: string, table: string) =>
    ['table-introspection', connectionId, schema, table] as const
}

export function useSchemas(connectionId?: string) {
  return useQuery<string[]>({
    queryKey: connectionId ? keys.schemas(connectionId) : ['schemas', 'disabled'],
    queryFn: () => dbdeskClient.listSchemas(connectionId as string),
    enabled: Boolean(connectionId)
  })
}

export function useTables(connectionId?: string, schema?: string) {
  const enabled = Boolean(connectionId && schema)
  return useQuery<string[]>({
    queryKey: enabled
      ? keys.tables(connectionId as string, schema as string)
      : ['tables', 'disabled'],
    queryFn: () => dbdeskClient.listTables(connectionId as string, schema as string),
    enabled
  })
}

export function useTableIntrospection(connectionId?: string, schema?: string, table?: string) {
  const enabled = Boolean(connectionId && schema && table)
  return useQuery<TableInfo>({
    queryKey: enabled
      ? keys.tableInfo(connectionId as string, schema as string, table as string)
      : ['table-introspection', 'disabled'],
    queryFn: () =>
      dbdeskClient.introspectTable(connectionId as string, schema as string, table as string),
    enabled
  })
}
