import type {
  ConnectionProfile,
  DatabaseType,
  DBConnectionOptions,
  QueryResult,
  TableInfo
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

  async introspectTable(connectionId: string, schema: string, table: string): Promise<TableInfo> {
    return getDbdesk().introspectTable(connectionId, schema, table)
  }
}

export type {
  ConnectionProfile,
  DatabaseType,
  DBConnectionOptions,
  QueryResult,
  TableInfo
} from '@common/types'
