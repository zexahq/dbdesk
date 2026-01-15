import type {
  AlterTableOptions,
  AlterTableResult,
  ColumnDefinition,
  CreateTableResult,
  DeleteTableResult,
  DeleteTableRowsResult,
  InsertTableRowResult,
  QueryResultRow,
  SchemaWithTables,
  TableDataOptions,
  TableDataResult,
  TableInfo,
  UpdateTableCellResult
} from '@common/types'
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { dbdeskClient } from '../../api/client'
import { toast } from '../../lib/toast'
import { cleanErrorMessage } from '../../lib/utils'

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
    options: Pick<TableDataOptions, 'limit' | 'offset' | 'sortRules' | 'filters'>
  ) =>
    [
      'table-data',
      connectionId,
      schema,
      table,
      options.limit ?? 50,
      options.offset ?? 0,
      options.sortRules ? JSON.stringify(options.sortRules) : null,
      options.filters ? JSON.stringify(options.filters) : null
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
  options: Pick<TableDataOptions, 'limit' | 'offset' | 'sortRules' | 'filters'> = {
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

export function useDeleteTableRows(connectionId?: string) {
  return useMutation({
    mutationFn: ({
      schema,
      table,
      rows
    }: {
      schema: string
      table: string
      rows: QueryResultRow[]
    }): Promise<DeleteTableRowsResult> => {
      if (!connectionId) {
        throw new Error('Connection ID is required to delete rows')
      }
      return dbdeskClient.deleteTableRows(connectionId, schema, table, rows)
    }
  })
}

export function useUpdateTableCell(connectionId?: string) {
  return useMutation({
    mutationFn: ({
      schema,
      table,
      columnToUpdate,
      newValue,
      row
    }: {
      schema: string
      table: string
      columnToUpdate: string
      newValue: unknown
      row: QueryResultRow
    }): Promise<UpdateTableCellResult> => {
      if (!connectionId) {
        throw new Error('Connection ID is required to update cell')
      }
      return dbdeskClient.updateTableCell(
        connectionId,
        schema,
        table,
        columnToUpdate,
        newValue,
        row
      )
    },
    onSuccess: (_, variables, _ctx, client) => {
      toast.success('Cell updated successfully.')
      client.client.invalidateQueries({
        queryKey: ['table-data', connectionId, variables.schema, variables.table]
      })
    },
    onError: (error) => {
      toast.error('Failed to update cell', {
        description: cleanErrorMessage(error.message)
      })
    }
  })
}

export function useDeleteTable(connectionId?: string) {
  return useMutation({
    mutationFn: ({
      schema,
      table
    }: {
      schema: string
      table: string
    }): Promise<DeleteTableResult> => {
      if (!connectionId) {
        throw new Error('Connection ID is required to delete table')
      }
      return dbdeskClient.deleteTable(connectionId, schema, table)
    },
    onSuccess: (result, variables, _ctx, client) => {
      if (result.success) {
        toast.success(`Table ${variables.schema}.${variables.table} deleted successfully`)
        client.client.invalidateQueries({
          queryKey: keys.schemasWithTables(connectionId!)
        })
      }
    },
    onError: (error) => {
      toast.error('Failed to delete table', {
        description: cleanErrorMessage(error.message)
      })
    }
  })
}
export function useCreateTable(connectionId?: string) {
  return useMutation({
    mutationFn: ({
      schema,
      table,
      columns
    }: {
      schema: string
      table: string
      columns: ColumnDefinition[]
    }): Promise<CreateTableResult> => {
      if (!connectionId) {
        throw new Error('Connection ID is required to create table')
      }
      return dbdeskClient.createTable(connectionId, schema, table, columns)
    },
    onSuccess: (result, variables, _ctx, client) => {
      if (result.success) {
        toast.success(`Table ${variables.schema}.${variables.table} created successfully`)
        client.client.invalidateQueries({ queryKey: keys.schemasWithTables(connectionId!) })
      }
    },
    onError: (error) => {
      toast.error('Failed to create table', { description: cleanErrorMessage(error.message) })
    }
  })
}

export function useAlterTable(connectionId?: string) {
  return useMutation({
    mutationFn: (options: Omit<AlterTableOptions, 'connectionId'>): Promise<AlterTableResult> => {
      if (!connectionId) {
        throw new Error('Connection ID is required to alter table')
      }
      return dbdeskClient.alterTable(connectionId, options)
    },
    onSuccess: (result, variables, _ctx, client) => {
      if (result.success) {
        const tableName = variables.newName || variables.table
        toast.success(`Table ${variables.schema}.${tableName} updated successfully`)
        client.client.invalidateQueries({ queryKey: keys.schemasWithTables(connectionId!) })
        client.client.invalidateQueries({
          queryKey: keys.tableInfo(connectionId!, variables.schema, variables.table)
        })
      }
    },
    onError: (error) => {
      toast.error('Failed to alter table', { description: cleanErrorMessage(error.message) })
    }
  })
}
export function useInsertTableRow(connectionId?: string, schema?: string, table?: string) {
  return useMutation({
    mutationFn: (values: Record<string, unknown>): Promise<InsertTableRowResult> => {
      if (!connectionId || !schema || !table) {
        throw new Error('Connection ID, schema, and table are required')
      }
      return dbdeskClient.insertTableRow(connectionId, schema, table, values)
    },
    onSuccess: (_result, _variables, _ctx, client) => {
      if (connectionId && schema && table) {
        client.client.invalidateQueries({ queryKey: keys.tableData(connectionId, schema, table, {}) })
      }
      toast.success('Row inserted successfully')
    },
    onError: (error) => {
      toast.error('Failed to insert row', { description: cleanErrorMessage(error.message) })
    }
  })
}
