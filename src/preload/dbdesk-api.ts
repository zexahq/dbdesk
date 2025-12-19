import type {
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
import { ipcRenderer } from 'electron'

export const dbdeskAPI = {
  /**
   * List all available database adapter types
   */
  async getAdapters(): Promise<DatabaseType[]> {
    return ipcRenderer.invoke('adapters:list')
  },

  /**
   * List all saved connection profiles
   */
  async listConnections(): Promise<ConnectionProfile[]> {
    return ipcRenderer.invoke('connections:list')
  },

  /**
   * Get a single connection profile by id
   */
  async getConnection(connectionId: string): Promise<ConnectionProfile> {
    if (!connectionId || typeof connectionId !== 'string' || connectionId.trim() === '') {
      throw new Error('Connection ID is required')
    }

    return ipcRenderer.invoke('connections:get', { connectionId: connectionId.trim() })
  },

  /**
   * Create a new connection profile
   */
  async createConnection(
    name: string,
    type: DatabaseType,
    options: DBConnectionOptions
  ): Promise<ConnectionProfile> {
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new Error('Connection name is required')
    }
    if (!type || typeof type !== 'string') {
      throw new Error('Database type is required')
    }
    if (!options || typeof options !== 'object') {
      throw new Error('Connection options are required')
    }

    return ipcRenderer.invoke('connections:create', { name: name.trim(), type, options })
  },

  /**
   * Update an existing connection profile
   */
  async updateConnection(
    connectionId: string,
    name: string,
    type: DatabaseType,
    options: DBConnectionOptions
  ): Promise<ConnectionProfile> {
    if (!connectionId || typeof connectionId !== 'string' || connectionId.trim() === '') {
      throw new Error('Connection ID is required')
    }
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new Error('Connection name is required')
    }
    if (!type || typeof type !== 'string') {
      throw new Error('Database type is required')
    }
    if (!options || typeof options !== 'object') {
      throw new Error('Connection options are required')
    }

    return ipcRenderer.invoke('connections:update', {
      connectionId: connectionId.trim(),
      name: name.trim(),
      type,
      options
    })
  },

  /**
   * Establish a connection to a database using a saved profile
   */
  async connect(connectionId: string): Promise<{ success: boolean; connectionId?: string }> {
    if (!connectionId || typeof connectionId !== 'string' || connectionId.trim() === '') {
      throw new Error('Connection ID is required')
    }

    return ipcRenderer.invoke('connections:connect', { connectionId: connectionId.trim() })
  },

  /**
   * Close an active database connection
   */
  async disconnect(connectionId: string): Promise<{ success: boolean }> {
    if (!connectionId || typeof connectionId !== 'string' || connectionId.trim() === '') {
      throw new Error('Connection ID is required')
    }

    return ipcRenderer.invoke('connections:disconnect', { connectionId: connectionId.trim() })
  },

  /**
   * Delete a connection profile
   */
  async deleteConnection(connectionId: string): Promise<{ success: boolean }> {
    if (!connectionId || typeof connectionId !== 'string' || connectionId.trim() === '') {
      throw new Error('Connection ID is required')
    }

    return ipcRenderer.invoke('connections:delete', { connectionId: connectionId.trim() })
  },

  /**
   * Execute a SQL query on a connected database
   */
  async runQuery(connectionId: string, query: string): Promise<QueryResult> {
    if (!connectionId || typeof connectionId !== 'string' || connectionId.trim() === '') {
      throw new Error('Connection ID is required')
    }
    if (!query || typeof query !== 'string' || query.trim() === '') {
      throw new Error('Query is required')
    }

    return ipcRenderer.invoke('query:run', {
      connectionId: connectionId.trim(),
      query: query.trim()
    })
  },

  /**
   * List all schemas in a connected database
   */
  async listSchemas(connectionId: string): Promise<string[]> {
    if (!connectionId || typeof connectionId !== 'string' || connectionId.trim() === '') {
      throw new Error('Connection ID is required')
    }

    return ipcRenderer.invoke('schema:list', { connectionId: connectionId.trim() })
  },

  /**
   * List all tables in a specific schema
   */
  async listTables(connectionId: string, schema: string): Promise<string[]> {
    if (!connectionId || typeof connectionId !== 'string' || connectionId.trim() === '') {
      throw new Error('Connection ID is required')
    }
    if (!schema || typeof schema !== 'string' || schema.trim() === '') {
      throw new Error('Schema name is required')
    }

    return ipcRenderer.invoke('schema:tables', {
      connectionId: connectionId.trim(),
      schema: schema.trim()
    })
  },

  /**
   * List all schemas with their tables
   */
  async listSchemasWithTables(connectionId: string): Promise<SchemaWithTables[]> {
    if (!connectionId || typeof connectionId !== 'string' || connectionId.trim() === '') {
      throw new Error('Connection ID is required')
    }

    return ipcRenderer.invoke('schema:listWithTables', { connectionId: connectionId.trim() })
  },

  /**
   * Get detailed information about a table structure
   */
  async introspectTable(connectionId: string, schema: string, table: string): Promise<TableInfo> {
    if (!connectionId || typeof connectionId !== 'string' || connectionId.trim() === '') {
      throw new Error('Connection ID is required')
    }
    if (!schema || typeof schema !== 'string' || schema.trim() === '') {
      throw new Error('Schema name is required')
    }
    if (!table || typeof table !== 'string' || table.trim() === '') {
      throw new Error('Table name is required')
    }

    return ipcRenderer.invoke('schema:introspect', {
      connectionId: connectionId.trim(),
      schema: schema.trim(),
      table: table.trim()
    })
  },

  /**
   * Fetch data from a table with pagination
   */
  async fetchTableData(
    connectionId: string,
    schema: string,
    table: string,
    options: Pick<TableDataOptions, 'limit' | 'offset' | 'sortRules' | 'filters'> = {
      limit: 50,
      offset: 0
    }
  ): Promise<TableDataResult> {
    if (!connectionId || typeof connectionId !== 'string' || connectionId.trim() === '') {
      throw new Error('Connection ID is required')
    }
    if (!schema || typeof schema !== 'string' || schema.trim() === '') {
      throw new Error('Schema name is required')
    }
    if (!table || typeof table !== 'string' || table.trim() === '') {
      throw new Error('Table name is required')
    }

    const payload: Record<string, unknown> = {
      connectionId: connectionId.trim(),
      schema: schema.trim(),
      table: table.trim()
    }

    if (options.limit !== undefined) {
      payload.limit = options.limit
    }

    if (options.offset !== undefined) {
      payload.offset = options.offset
    }

    if (options.sortRules && options.sortRules.length > 0) {
      payload.sortRules = options.sortRules
    }

    if (options.filters && options.filters.length > 0) {
      payload.filters = options.filters
    }

    return ipcRenderer.invoke('table:data', payload)
  },

  /**
   * Delete rows from a table using their primary key values
   */
  async deleteTableRows(
    connectionId: string,
    schema: string,
    table: string,
    rows: QueryResultRow[]
  ): Promise<DeleteTableRowsResult> {
    if (!connectionId || typeof connectionId !== 'string' || connectionId.trim() === '') {
      throw new Error('Connection ID is required')
    }
    if (!schema || typeof schema !== 'string' || schema.trim() === '') {
      throw new Error('Schema name is required')
    }
    if (!table || typeof table !== 'string' || table.trim() === '') {
      throw new Error('Table name is required')
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error('At least one row is required to delete')
    }

    return ipcRenderer.invoke('table:deleteRows', {
      connectionId: connectionId.trim(),
      schema: schema.trim(),
      table: table.trim(),
      rows
    })
  },

  /**
   * Update a single cell in a table using primary keys to identify the row
   */
  async updateTableCell(
    connectionId: string,
    schema: string,
    table: string,
    columnToUpdate: string,
    newValue: unknown,
    row: QueryResultRow
  ): Promise<UpdateTableCellResult> {
    if (!connectionId || typeof connectionId !== 'string' || connectionId.trim() === '') {
      throw new Error('Connection ID is required')
    }
    if (!schema || typeof schema !== 'string' || schema.trim() === '') {
      throw new Error('Schema name is required')
    }
    if (!table || typeof table !== 'string' || table.trim() === '') {
      throw new Error('Table name is required')
    }
    if (!columnToUpdate || typeof columnToUpdate !== 'string' || columnToUpdate.trim() === '') {
      throw new Error('Column to update is required')
    }
    if (!row || typeof row !== 'object') {
      throw new Error('Row data is required')
    }

    return ipcRenderer.invoke('table:updateCell', {
      connectionId: connectionId.trim(),
      schema: schema.trim(),
      table: table.trim(),
      columnToUpdate: columnToUpdate.trim(),
      newValue,
      row
    })
  },

  /**
   * Load workspace data for a connection
   */
  async loadWorkspace(connectionId: string): Promise<unknown> {
    if (!connectionId || typeof connectionId !== 'string' || connectionId.trim() === '') {
      throw new Error('Connection ID is required')
    }

    return ipcRenderer.invoke('workspace:load', { connectionId: connectionId.trim() })
  },

  /**
   * Save workspace data for a connection
   */
  async saveWorkspace(workspace: unknown): Promise<void> {
    if (!workspace || typeof workspace !== 'object') {
      throw new Error('Workspace data is required')
    }

    return ipcRenderer.invoke('workspace:save', { workspace })
  },

  /**
   * Delete workspace data for a connection
   */
  async deleteWorkspace(connectionId: string): Promise<void> {
    if (!connectionId || typeof connectionId !== 'string' || connectionId.trim() === '') {
      throw new Error('Connection ID is required')
    }

    return ipcRenderer.invoke('workspace:delete', { connectionId: connectionId.trim() })
  },

  /**
   * Load all saved queries for a connection
   */
  async loadQueries(connectionId: string): Promise<SavedQuery[]> {
    if (!connectionId || typeof connectionId !== 'string' || connectionId.trim() === '') {
      throw new Error('Connection ID is required')
    }

    return ipcRenderer.invoke('queries:load', { connectionId: connectionId.trim() })
  },

  /**
   * Save a new query for a connection
   */
  async saveQuery(connectionId: string, name: string, content: string): Promise<SavedQuery> {
    if (!connectionId || typeof connectionId !== 'string' || connectionId.trim() === '') {
      throw new Error('Connection ID is required')
    }
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new Error('Query name is required')
    }
    if (!content || typeof content !== 'string' || content.trim() === '') {
      throw new Error('Query content is required')
    }

    return ipcRenderer.invoke('queries:save', {
      connectionId: connectionId.trim(),
      name: name.trim(),
      content: content.trim()
    })
  },

  /**
   * Delete a saved query
   */
  async deleteQuery(connectionId: string, queryId: string): Promise<void> {
    if (!connectionId || typeof connectionId !== 'string' || connectionId.trim() === '') {
      throw new Error('Connection ID is required')
    }
    if (!queryId || typeof queryId !== 'string' || queryId.trim() === '') {
      throw new Error('Query ID is required')
    }

    return ipcRenderer.invoke('queries:delete', {
      connectionId: connectionId.trim(),
      queryId: queryId.trim()
    })
  },

  /**
   * Update an existing saved query
   */
  async updateQuery(
    connectionId: string,
    queryId: string,
    name: string,
    content: string
  ): Promise<SavedQuery | undefined> {
    if (!connectionId || typeof connectionId !== 'string' || connectionId.trim() === '') {
      throw new Error('Connection ID is required')
    }
    if (!queryId || typeof queryId !== 'string' || queryId.trim() === '') {
      throw new Error('Query ID is required')
    }
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new Error('Query name is required')
    }
    if (!content || typeof content !== 'string' || content.trim() === '') {
      throw new Error('Query content is required')
    }

    return ipcRenderer.invoke('queries:update', {
      connectionId: connectionId.trim(),
      queryId: queryId.trim(),
      name: name.trim(),
      content: content.trim()
    })
  }
}

export type DbdeskAPI = typeof dbdeskAPI