import { ipcRenderer } from 'electron'
import type {
  ConnectionProfile,
  DatabaseType,
  DBConnectionOptions,
  QueryResult,
  TableDataOptions,
  TableDataResult,
  TableInfo
} from '@common/types'

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
    options: Pick<TableDataOptions, 'limit' | 'offset' | 'sortColumn' | 'sortOrder'> = {
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

    if (options.sortColumn) {
      payload.sortColumn = options.sortColumn
    }

    if (options.sortOrder) {
      payload.sortOrder = options.sortOrder
    }

    return ipcRenderer.invoke('table:data', payload)
  }
}

export type DbdeskAPI = typeof dbdeskAPI
