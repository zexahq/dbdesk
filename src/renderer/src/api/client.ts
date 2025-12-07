import type {
  ConnectionProfile,
  ConnectionWorkspace,
  DatabaseType,
  DBConnectionOptions,
  DeleteTableRowsResult,
  QueryResult,
  QueryResultRow,
  SchemaWithTables,
  TableDataOptions,
  TableDataResult,
  TableInfo,
  UpdateTableCellResult
} from '@common/types'

function getDbdesk() {
  if (typeof window === 'undefined' || !window.dbdesk) {
    throw new Error(
      'DBDesk preload API is not available. Ensure preload is loaded and contextIsolation is enabled.'
    )
  }
  return window.dbdesk
}

export const dbdeskClient = {
  async getAdapters(): Promise<DatabaseType[]> {
    return getDbdesk().getAdapters()
  },

  async listConnections(): Promise<ConnectionProfile[]> {
    return getDbdesk().listConnections()
  },

  async getConnection(connectionId: string): Promise<ConnectionProfile> {
    return getDbdesk().getConnection(connectionId)
  },

  async createConnection(
    name: string,
    type: DatabaseType,
    options: DBConnectionOptions
  ): Promise<ConnectionProfile> {
    return getDbdesk().createConnection(name, type, options)
  },

  async updateConnection(
    connectionId: string,
    name: string,
    type: DatabaseType,
    options: DBConnectionOptions
  ): Promise<ConnectionProfile> {
    return getDbdesk().updateConnection(connectionId, name, type, options)
  },

  async connect(connectionId: string): Promise<{ success: boolean; connectionId?: string }> {
    return getDbdesk().connect(connectionId)
  },

  async disconnect(connectionId: string): Promise<{ success: boolean }> {
    return getDbdesk().disconnect(connectionId)
  },

  async deleteConnection(connectionId: string): Promise<{ success: boolean }> {
    return getDbdesk().deleteConnection(connectionId)
  },

  async runQuery(connectionId: string, query: string): Promise<QueryResult> {
    return getDbdesk().runQuery(connectionId, query)
  },

  async listSchemas(connectionId: string): Promise<string[]> {
    return getDbdesk().listSchemas(connectionId)
  },

  async listTables(connectionId: string, schema: string): Promise<string[]> {
    return getDbdesk().listTables(connectionId, schema)
  },

  async listSchemasWithTables(connectionId: string): Promise<SchemaWithTables[]> {
    return getDbdesk().listSchemasWithTables(connectionId)
  },

  async introspectTable(connectionId: string, schema: string, table: string): Promise<TableInfo> {
    return getDbdesk().introspectTable(connectionId, schema, table)
  },

  async fetchTableData(
    connectionId: string,
    schema: string,
    table: string,
    options?: Pick<TableDataOptions, 'limit' | 'offset' | 'sortRules' | 'filters'>
  ): Promise<TableDataResult> {
    return getDbdesk().fetchTableData(connectionId, schema, table, options)
  },

  async deleteTableRows(
    connectionId: string,
    schema: string,
    table: string,
    rows: QueryResultRow[]
  ): Promise<DeleteTableRowsResult> {
    return getDbdesk().deleteTableRows(connectionId, schema, table, rows)
  },

  async updateTableCell(
    connectionId: string,
    schema: string,
    table: string,
    columnToUpdate: string,
    newValue: unknown,
    row: QueryResultRow
  ): Promise<UpdateTableCellResult> {
    return getDbdesk().updateTableCell(connectionId, schema, table, columnToUpdate, newValue, row)
  },

  async loadWorkspace(connectionId: string): Promise<ConnectionWorkspace | undefined> {
    return getDbdesk().loadWorkspace(connectionId) as Promise<ConnectionWorkspace | undefined>
  },

  async saveWorkspace(workspace: ConnectionWorkspace): Promise<void> {
    return getDbdesk().saveWorkspace(workspace)
  },

  async deleteWorkspace(connectionId: string): Promise<void> {
    return getDbdesk().deleteWorkspace(connectionId)
  }
}

export type {
  ConnectionProfile,
  DatabaseType,
  DBConnectionOptions,
  DeleteTableRowsResult,
  QueryResult,
  QueryResultRow,
  SchemaWithTables,
  TableDataOptions,
  TableDataResult,
  TableInfo,
  UpdateTableCellResult
} from '@common/types'
