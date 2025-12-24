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

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? ''

async function request<T>(path: string, options: RequestInit = {}) {
  const url = `${baseUrl}${path}`
  const res = await fetch(url, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`)
  }
  if (res.status === 204) return undefined as unknown as T
  const contentType = (res.headers.get('content-type') ?? '').toLowerCase()
  if (!contentType.includes('application/json')) {
    const text = await res.text()
    throw new Error(
      `Expected JSON response but received ${contentType || 'unknown content-type'}: ${
        text ? text.slice(0, 300) : '<empty response>'
      }`
    )
  }

  return (await res.json()) as T
}

export const httpClient = {
  async getAdapters(): Promise<DatabaseType[]> {
    return request<DatabaseType[]>('/api/adapters')
  },

  async listConnections(): Promise<ConnectionProfile[]> {
    return request<ConnectionProfile[]>('/api/connections')
  },

  async getConnection(connectionId: string): Promise<ConnectionProfile> {
    return request<ConnectionProfile>(`/api/connections/${connectionId}`)
  },

  async createConnection(
    name: string,
    type: DatabaseType,
    options: DBConnectionOptions
  ): Promise<ConnectionProfile> {
    return request<ConnectionProfile>('/api/connections', {
      method: 'POST',
      body: JSON.stringify({ name, type, options })
    })
  },

  async updateConnection(
    connectionId: string,
    name: string,
    type: DatabaseType,
    options: DBConnectionOptions
  ): Promise<ConnectionProfile> {
    return request<ConnectionProfile>(`/api/connections/${connectionId}`, {
      method: 'PUT',
      body: JSON.stringify({ name, type, options })
    })
  },

  async connect(connectionId: string): Promise<{ success: boolean; connectionId?: string }> {
    return request(`/api/connections/${connectionId}/connect`, { method: 'POST' })
  },

  async disconnect(connectionId: string): Promise<{ success: boolean }> {
    return request(`/api/connections/${connectionId}/disconnect`, { method: 'POST' })
  },

  async deleteConnection(connectionId: string): Promise<{ success: boolean }> {
    return request(`/api/connections/${connectionId}`, { method: 'DELETE' })
  },

  async runQuery(connectionId: string, query: string): Promise<QueryResult> {
    return request<QueryResult>(`/api/connections/${connectionId}/query`, {
      method: 'POST',
      body: JSON.stringify({ query })
    })
  },

  async listSchemas(connectionId: string): Promise<string[]> {
    return request<string[]>(`/api/connections/${connectionId}/schemas`)
  },

  async listTables(connectionId: string, schema: string): Promise<string[]> {
    return request<string[]>(
      `/api/connections/${connectionId}/schemas/${encodeURIComponent(schema)}/tables`
    )
  },

  async listSchemasWithTables(connectionId: string): Promise<SchemaWithTables[]> {
    return request<SchemaWithTables[]>(`/api/connections/${connectionId}/schemas-with-tables`)
  },

  async introspectTable(connectionId: string, schema: string, table: string): Promise<TableInfo> {
    return request<TableInfo>(
      `/api/connections/${connectionId}/schemas/${encodeURIComponent(schema)}/tables/${encodeURIComponent(table)}/introspect`
    )
  },

  async fetchTableData(
    connectionId: string,
    schema: string,
    table: string,
    options?: Pick<TableDataOptions, 'limit' | 'offset' | 'sortRules' | 'filters'>
  ): Promise<TableDataResult> {
    return request<TableDataResult>(
      `/api/connections/${connectionId}/schemas/${encodeURIComponent(schema)}/tables/${encodeURIComponent(
        table
      )}/data`,
      { method: 'POST', body: JSON.stringify(options ?? {}) }
    )
  },

  async deleteTableRows(
    connectionId: string,
    schema: string,
    table: string,
    rows: QueryResultRow[]
  ): Promise<DeleteTableRowsResult> {
    return request<DeleteTableRowsResult>(
      `/api/connections/${connectionId}/schemas/${encodeURIComponent(schema)}/tables/${encodeURIComponent(
        table
      )}/rows/delete`,
      { method: 'POST', body: JSON.stringify({ rows }) }
    )
  },

  async updateTableCell(
    connectionId: string,
    schema: string,
    table: string,
    columnToUpdate: string,
    newValue: unknown,
    row: QueryResultRow
  ): Promise<UpdateTableCellResult> {
    return request<UpdateTableCellResult>(
      `/api/connections/${connectionId}/schemas/${encodeURIComponent(schema)}/tables/${encodeURIComponent(
        table
      )}/cell`,
      { method: 'POST', body: JSON.stringify({ columnToUpdate, newValue, row }) }
    )
  },

  async loadWorkspace(connectionId: string): Promise<ConnectionWorkspace | undefined> {
    return request<ConnectionWorkspace | undefined>(`/api/connections/${connectionId}/workspace`)
  },

  async saveWorkspace(workspace: ConnectionWorkspace): Promise<void> {
    await request<void>(`/api/connections/${workspace.connectionId}/workspace`, {
      method: 'POST',
      body: JSON.stringify(workspace)
    })
  },

  async deleteWorkspace(connectionId: string): Promise<void> {
    await request<void>(`/api/connections/${connectionId}/workspace`, { method: 'DELETE' })
  },

  async loadQueries(connectionId: string): Promise<SavedQuery[]> {
    return request<SavedQuery[]>(`/api/connections/${connectionId}/queries`)
  },

  async saveQuery(
    connectionId: string,
    id: string,
    name: string,
    content: string
  ): Promise<SavedQuery> {
    return request<SavedQuery>(`/api/connections/${connectionId}/queries`, {
      method: 'POST',
      body: JSON.stringify({ connectionId, id, name, content })
    })
  },

  async deleteQuery(connectionId: string, queryId: string): Promise<void> {
    await request<void>(`/api/connections/${connectionId}/queries/${queryId}`, { method: 'DELETE' })
  },

  async updateQuery(
    connectionId: string,
    queryId: string,
    name: string,
    content: string
  ): Promise<SavedQuery | undefined> {
    return request<SavedQuery | undefined>(`/api/connections/${connectionId}/queries/${queryId}`, {
      method: 'PUT',
      body: JSON.stringify({ name, content })
    })
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
}
