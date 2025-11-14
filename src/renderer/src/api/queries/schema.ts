import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { dbdeskClient } from '../../api/client'
import type { SchemaWithTables, TableDataOptions, TableDataResult, TableInfo } from '@common/types'

const keys = {
  schemas: (connectionId: string) => ['schemas', connectionId] as const,
  schemasWithTables: (connectionId: string) => ['schemasWithTables', connectionId] as const,
  tables: (connectionId: string, schema: string) => ['tables', connectionId, schema] as const,
  tableInfo: (connectionId: string, schema: string, table: string) =>
    ['table-introspection', connectionId, schema, table] as const,
  tableData: (
    connectionId: string,
    schema: string,
    table: string,
    options: Pick<TableDataOptions, 'limit' | 'offset' | 'sortColumn' | 'sortOrder'>
  ) =>
    [
      'table-data',
      connectionId,
      schema,
      table,
      options.limit ?? 50,
      options.offset ?? 0,
      options.sortColumn ?? null,
      options.sortOrder ?? null
    ] as const
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

export function useSchemasWithTables(connectionId?: string) {
  return useQuery<SchemaWithTables[]>({
    queryKey: connectionId
      ? keys.schemasWithTables(connectionId)
      : ['schemasWithTables', 'disabled'],
    queryFn: () => dbdeskClient.listSchemasWithTables(connectionId as string),
    enabled: Boolean(connectionId)
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

export function useTableData(
  connectionId?: string,
  schema?: string,
  table?: string,
  options: Pick<TableDataOptions, 'limit' | 'offset' | 'sortColumn' | 'sortOrder'> = {
    limit: 50,
    offset: 0
  }
) {
  const enabled = Boolean(connectionId && schema && table)
  return useQuery<TableDataResult>({
    queryKey: enabled
      ? keys.tableData(connectionId as string, schema as string, table as string, options)
      : ['table-data', 'disabled'],
    queryFn: () =>
      dbdeskClient.fetchTableData(
        connectionId as string,
        schema as string,
        table as string,
        options
      ),
    enabled,
    placeholderData: keepPreviousData
  })
}
