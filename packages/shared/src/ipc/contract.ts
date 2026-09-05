import type {
  ColumnDefinition,
  ConnectionProfile,
  ConnectionWorkspace,
  CreateTableResult,
  DashboardConfig,
  DashboardExport,
  DatabaseType,
  DBConnectionOptions,
  DeleteTableResult,
  DeleteTableRowsResult,
  ExportTableResult,
  InsertTableRowResult,
  QueryBatchResult,
  QueryResult,
  QueryResultRow,
  SavedQuery,
  SchemaWithTables,
  TableDataResult,
  TableFilterCondition,
  TableInfo,
  TableSortRule,
  UpdateTableCellResult,
} from '../types'

// ── IPC Contract ──
// Maps every IPC channel to its payload and result types.
// This is the single source of truth for the IPC layer.

export interface IpcContract {
  // -- Adapters --
  'adapters:list': {
    payload: void
    result: DatabaseType[]
  }

  // -- Connections CRUD --
  'connections:list': {
    payload: void
    result: ConnectionProfile[]
  }
  'connections:get': {
    payload: { connectionId: string }
    result: ConnectionProfile
  }
  'connections:create': {
    payload: { name: string; type: DatabaseType; options: DBConnectionOptions }
    result: ConnectionProfile
  }
  'connections:update': {
    payload: {
      connectionId: string
      name: string
      type: DatabaseType
      options: DBConnectionOptions
    }
    result: ConnectionProfile
  }
  'connections:connect': {
    payload: { connectionId: string }
    result: { success: boolean; connectionId?: string }
  }
  'connections:disconnect': {
    payload: { connectionId: string }
    result: { success: boolean }
  }
  'connections:delete': {
    payload: { connectionId: string }
    result: { success: boolean }
  }

  // -- Query --
  'query:run': {
    payload: {
      connectionId: string
      query: string
      limit?: number
      offset?: number
      queryId?: string
    }
    result: QueryResult
  }
  'query:runMany': {
    payload: { connectionId: string; queries: string[]; limit?: number; offset?: number }
    result: QueryBatchResult[]
  }
  'query:cancel': {
    payload: { connectionId: string; queryId: string }
    result: { cancelled: boolean }
  }

  // -- Schema --
  'schema:list': {
    payload: { connectionId: string }
    result: string[]
  }
  'schema:tables': {
    payload: { connectionId: string; schema: string }
    result: string[]
  }
  'schema:listWithTables': {
    payload: { connectionId: string }
    result: SchemaWithTables[]
  }
  'schema:introspect': {
    payload: { connectionId: string; schema: string; table: string }
    result: TableInfo
  }

  // -- Table Data --
  'table:data': {
    payload: {
      connectionId: string
      schema: string
      table: string
      limit?: number
      offset?: number
      sortRules?: TableSortRule[]
      filters?: TableFilterCondition[]
    }
    result: TableDataResult
  }
  'table:deleteRows': {
    payload: { connectionId: string; schema: string; table: string; rows: QueryResultRow[] }
    result: DeleteTableRowsResult
  }
  'table:updateCell': {
    payload: {
      connectionId: string
      schema: string
      table: string
      columnToUpdate: string
      newValue: unknown
      row: QueryResultRow
    }
    result: UpdateTableCellResult
  }
  'table:insertRow': {
    payload: {
      connectionId: string
      schema: string
      table: string
      values: Record<string, unknown>
    }
    result: InsertTableRowResult
  }
  'table:exportCSV': {
    payload: {
      connectionId: string
      schema: string
      table: string
      sortRules?: TableSortRule[]
      filters?: TableFilterCondition[]
    }
    result: ExportTableResult
  }
  'table:exportSQL': {
    payload: {
      connectionId: string
      schema: string
      table: string
      sortRules?: TableSortRule[]
      filters?: TableFilterCondition[]
    }
    result: ExportTableResult
  }
  'table:delete': {
    payload: { connectionId: string; schema: string; table: string }
    result: DeleteTableResult
  }
  'table:create': {
    payload: {
      connectionId: string
      schema: string
      table: string
      columns: ColumnDefinition[]
    }
    result: CreateTableResult
  }

  // -- Workspace --
  'workspace:load': {
    payload: { connectionId: string }
    result: ConnectionWorkspace | undefined
  }
  'workspace:save': {
    payload: { workspace: ConnectionWorkspace }
    result: void
  }
  'workspace:delete': {
    payload: { connectionId: string }
    result: void
  }

  // -- Saved Queries --
  'queries:save': {
    payload: { connectionId: string; id: string; name: string; content: string }
    result: SavedQuery
  }
  'queries:load': {
    payload: { connectionId: string }
    result: SavedQuery[]
  }
  'queries:delete': {
    payload: { connectionId: string; queryId: string }
    result: void
  }
  'queries:update': {
    payload: { connectionId: string; queryId: string; name: string; content: string }
    result: SavedQuery | undefined
  }

  // -- Auth --
  'auth:get-session': {
    payload: void
    result: {
      session: { id: string; expiresAt: string; token: string; userId: string }
      user: { id: string; name: string; email: string; image: string | null }
    } | null
  }
  'auth:get-token': {
    payload: void
    result: { token: string | null }
  }
  'auth:logout': {
    payload: void
    result: void
  }

  // -- Updates --
  'update:check': {
    payload: void
    result: void
  }
  'update:download': {
    payload: void
    result: void
  }
  'update:install': {
    payload: void
    result: void
  }
  'update:get-version': {
    payload: void
    result: { version: string }
  }

  // -- Dashboards --
  'dashboards:load': {
    payload: { connectionId: string }
    result: DashboardConfig[]
  }
  'dashboards:get': {
    payload: { connectionId: string; dashboardId: string }
    result: DashboardConfig | undefined
  }
  'dashboards:save': {
    payload: DashboardConfig
    result: DashboardConfig
  }
  'dashboards:delete': {
    payload: { connectionId: string; dashboardId: string }
    result: boolean
  }
  'dashboards:persist': {
    payload: { dashboardId: string }
    result: void
  }
  'dashboards:persist-all': {
    payload: void
    result: void
  }
  'dashboards:export': {
    payload: { connectionId?: string } | undefined
    result: DashboardExport
  }
  'dashboards:import': {
    payload: { dashboards: DashboardConfig[]; overwrite?: boolean }
    result: { imported: number; skipped: number }
  }

  // CLI installation
  'cli:get-status': {
    payload: void
    result: { installed: boolean; promptDismissed: boolean }
  }
  'cli:install': {
    payload: void
    result: { ok: boolean; error?: string }
  }
  'cli:dismiss-prompt': {
    payload: void
    result: void
  }
}

/** Union of all IPC channel names */
export type IpcChannel = keyof IpcContract
