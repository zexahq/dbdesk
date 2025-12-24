import type {
  ConnectionProfile,
  ConnectionWorkspace,
  DatabaseType,
  DBConnectionOptions,
  DeleteTableRowsResult,
  QueryResult,
  QueryResultRow,
  SavedQuery,
  SchemaWithTables,
  TableDataOptions,
  TableDataResult,
  TableInfo,
  UpdateTableCellResult
} from '@common/types'

import { httpClient } from './http-client'

function isDesktop(): boolean {
  // Environment override: VITE_FORCE_DESKTOP=true forces desktop mode (useful for dev)
  const force = (import.meta.env.VITE_FORCE_DESKTOP ?? '').toString().toLowerCase()
  if (force === 'true' || force === '1') return true
  return typeof window !== 'undefined' && !!(window as any).dbdesk
}

function impl(): any {
  if (isDesktop()) return (window as any).dbdesk
  return httpClient
}

export const dbdeskClient = {
  async getAdapters(): Promise<DatabaseType[]> {
    return impl().getAdapters()
  },

  async listConnections(): Promise<ConnectionProfile[]> {
    return impl().listConnections()
  },

  async getConnection(connectionId: string): Promise<ConnectionProfile> {
    return impl().getConnection(connectionId)
  },

  async createConnection(
    name: string,
    type: DatabaseType,
    options: DBConnectionOptions
  ): Promise<ConnectionProfile> {
    return impl().createConnection(name, type, options)
  },

  async updateConnection(
    connectionId: string,
    name: string,
    type: DatabaseType,
    options: DBConnectionOptions
  ): Promise<ConnectionProfile> {
    return impl().updateConnection(connectionId, name, type, options)
  },

  async connect(connectionId: string): Promise<{ success: boolean; connectionId?: string }> {
    return impl().connect(connectionId)
  },

  async disconnect(connectionId: string): Promise<{ success: boolean }> {
    return impl().disconnect(connectionId)
  },

  async deleteConnection(connectionId: string): Promise<{ success: boolean }> {
    return impl().deleteConnection(connectionId)
  },

  async runQuery(connectionId: string, query: string): Promise<QueryResult> {
    return impl().runQuery(connectionId, query)
  },

  async listSchemas(connectionId: string): Promise<string[]> {
    return impl().listSchemas(connectionId)
  },

  async listTables(connectionId: string, schema: string): Promise<string[]> {
    return impl().listTables(connectionId, schema)
  },

  async listSchemasWithTables(connectionId: string): Promise<SchemaWithTables[]> {
    return impl().listSchemasWithTables(connectionId)
  },

  async introspectTable(connectionId: string, schema: string, table: string): Promise<TableInfo> {
    return impl().introspectTable(connectionId, schema, table)
  },

  async fetchTableData(
    connectionId: string,
    schema: string,
    table: string,
    options?: Pick<TableDataOptions, 'limit' | 'offset' | 'sortRules' | 'filters'>
  ): Promise<TableDataResult> {
    return impl().fetchTableData(connectionId, schema, table, options)
  },

  async deleteTableRows(
    connectionId: string,
    schema: string,
    table: string,
    rows: QueryResultRow[]
  ): Promise<DeleteTableRowsResult> {
    return impl().deleteTableRows(connectionId, schema, table, rows)
  },

  async updateTableCell(
    connectionId: string,
    schema: string,
    table: string,
    columnToUpdate: string,
    newValue: unknown,
    row: QueryResultRow
  ): Promise<UpdateTableCellResult> {
    return impl().updateTableCell(connectionId, schema, table, columnToUpdate, newValue, row)
  },

  async loadWorkspace(connectionId: string): Promise<ConnectionWorkspace | undefined> {
    return impl().loadWorkspace(connectionId) as Promise<ConnectionWorkspace | undefined>
  },

  async saveWorkspace(workspace: ConnectionWorkspace): Promise<void> {
    return impl().saveWorkspace(workspace)
  },

  async deleteWorkspace(connectionId: string): Promise<void> {
    return impl().deleteWorkspace(connectionId)
  },

  async loadQueries(connectionId: string): Promise<SavedQuery[]> {
    return impl().loadQueries(connectionId)
  },

  async saveQuery(connectionId: string, name: string, content: string): Promise<SavedQuery> {
    return impl().saveQuery(connectionId, name, content)
  },

  async deleteQuery(connectionId: string, queryId: string): Promise<void> {
    return impl().deleteQuery(connectionId, queryId)
  },

  async updateQuery(
    connectionId: string,
    queryId: string,
    name: string,
    content: string
  ): Promise<SavedQuery | undefined> {
    return impl().updateQuery(connectionId, queryId, name, content)
  }
}

export type {
  ConnectionProfile,
  DatabaseType,
  DBConnectionOptions,
  DeleteTableRowsResult,
  QueryResult,
  QueryResultRow,
  SavedQuery,
  SchemaWithTables,
  TableDataOptions,
  TableDataResult,
  TableInfo,
  UpdateTableCellResult
} from '@common/types'
