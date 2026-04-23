import type {
  ColumnDefinition,
  ConnectionWorkspace,
  DatabaseType,
  DBConnectionOptions,
  ExportTableOptions,
  QueryResultRow,
  TableDataOptions,
} from '@dbdesk/shared/types'
import { ipcRenderer } from 'electron'
import { typedInvoke } from './typed-ipc'

export const dbdeskAPI = {
  // ── Adapters ──
  getAdapters: () => typedInvoke('adapters:list'),

  // ── Connections CRUD ──
  listConnections: () => typedInvoke('connections:list'),
  getConnection: (connectionId: string) =>
    typedInvoke('connections:get', { connectionId }),
  createConnection: (name: string, type: DatabaseType, options: DBConnectionOptions) =>
    typedInvoke('connections:create', { name, type, options }),
  updateConnection: (
    connectionId: string,
    name: string,
    type: DatabaseType,
    options: DBConnectionOptions,
  ) => typedInvoke('connections:update', { connectionId, name, type, options }),
  connect: (connectionId: string) =>
    typedInvoke('connections:connect', { connectionId }),
  disconnect: (connectionId: string) =>
    typedInvoke('connections:disconnect', { connectionId }),
  deleteConnection: (connectionId: string) =>
    typedInvoke('connections:delete', { connectionId }),

  // ── Query ──
  runQuery: (connectionId: string, query: string, options?: { limit?: number; offset?: number }) =>
    typedInvoke('query:run', {
      connectionId,
      query,
      limit: options?.limit,
      offset: options?.offset,
    }),
  runManyQueries: (connectionId: string, queries: string[], options?: { limit?: number; offset?: number }) =>
    typedInvoke('query:runMany', {
      connectionId,
      queries,
      limit: options?.limit,
      offset: options?.offset,
    }),

  // ── Schema ──
  listSchemas: (connectionId: string) =>
    typedInvoke('schema:list', { connectionId }),
  listTables: (connectionId: string, schema: string) =>
    typedInvoke('schema:tables', { connectionId, schema }),
  listSchemasWithTables: (connectionId: string) =>
    typedInvoke('schema:listWithTables', { connectionId }),
  introspectTable: (connectionId: string, schema: string, table: string) =>
    typedInvoke('schema:introspect', { connectionId, schema, table }),

  // ── Table Data ──
  fetchTableData: (
    connectionId: string,
    schema: string,
    table: string,
    options: Pick<TableDataOptions, 'limit' | 'offset' | 'sortRules' | 'filters'> = {},
  ) =>
    typedInvoke('table:data', {
      connectionId,
      schema,
      table,
      ...options,
    }),
  deleteTableRows: (
    connectionId: string,
    schema: string,
    table: string,
    rows: QueryResultRow[],
  ) => typedInvoke('table:deleteRows', { connectionId, schema, table, rows }),
  updateTableCell: (
    connectionId: string,
    schema: string,
    table: string,
    columnToUpdate: string,
    newValue: unknown,
    row: QueryResultRow,
  ) => typedInvoke('table:updateCell', { connectionId, schema, table, columnToUpdate, newValue, row }),
  insertTableRow: (connectionId: string, schema: string, table: string, values: Record<string, unknown>) =>
    typedInvoke('table:insertRow', { connectionId, schema, table, values }),

  // ── Table Export / DDL ──
  exportTableAsCSV: (
    connectionId: string,
    schema: string,
    table: string,
    options: Pick<ExportTableOptions, 'sortRules' | 'filters'> = {},
  ) => typedInvoke('table:exportCSV', { connectionId, schema, table, ...options }),
  exportTableAsSQL: (
    connectionId: string,
    schema: string,
    table: string,
    options: Pick<ExportTableOptions, 'sortRules' | 'filters'> = {},
  ) => typedInvoke('table:exportSQL', { connectionId, schema, table, ...options }),
  deleteTable: (connectionId: string, schema: string, table: string) =>
    typedInvoke('table:delete', { connectionId, schema, table }),
  createTable: (connectionId: string, schema: string, table: string, columns: ColumnDefinition[]) =>
    typedInvoke('table:create', { connectionId, schema, table, columns }),

  // ── Workspace ──
  loadWorkspace: (connectionId: string) =>
    typedInvoke('workspace:load', { connectionId }),
  saveWorkspace: (workspace: ConnectionWorkspace) =>
    typedInvoke('workspace:save', { workspace }),
  deleteWorkspace: (connectionId: string) =>
    typedInvoke('workspace:delete', { connectionId }),

  // ── Saved Queries ──
  loadQueries: (connectionId: string) =>
    typedInvoke('queries:load', { connectionId }),
  saveQuery: (connectionId: string, id: string, name: string, content: string) =>
    typedInvoke('queries:save', { connectionId, id, name, content }),
  deleteQuery: (connectionId: string, queryId: string) =>
    typedInvoke('queries:delete', { connectionId, queryId }),
  updateQuery: (connectionId: string, queryId: string, name: string, content: string) =>
    typedInvoke('queries:update', { connectionId, queryId, name, content }),

  // ── Auth ──
  getSession: () => typedInvoke('auth:get-session'),
  getToken: () => typedInvoke('auth:get-token'),
  logout: () => typedInvoke('auth:logout'),

  // ── Updates ──
  checkForUpdate: () => typedInvoke('update:check'),
  downloadUpdate: () => typedInvoke('update:download'),
  installUpdate: () => typedInvoke('update:install'),
  getAppVersion: () => typedInvoke('update:get-version'),

  onUpdateAvailable(callback: (data: { version: string; releaseNotes?: string }) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, data: { version: string; releaseNotes?: string }) => callback(data)
    ipcRenderer.on('update:available', handler)
    return () => ipcRenderer.removeListener('update:available', handler)
  },
  onUpdateDownloaded(callback: (data: { version: string }) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, data: { version: string }) => callback(data)
    ipcRenderer.on('update:downloaded', handler)
    return () => ipcRenderer.removeListener('update:downloaded', handler)
  },
  onUpdateProgress(callback: (data: { percent: number }) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, data: { percent: number }) => callback(data)
    ipcRenderer.on('update:progress', handler)
    return () => ipcRenderer.removeListener('update:progress', handler)
  },
  onUpdateError(callback: (data: { message: string }) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, data: { message: string }) => callback(data)
    ipcRenderer.on('update:error', handler)
    return () => ipcRenderer.removeListener('update:error', handler)
  },

  // ── Window Controls ──
  minimizeWindow: () => ipcRenderer.invoke('window:minimize') as Promise<void>,
  maximizeWindow: () => ipcRenderer.invoke('window:maximize') as Promise<void>,
  closeWindow: () => ipcRenderer.invoke('window:close') as Promise<void>,
  moveWindow: (deltaX: number, deltaY: number) =>
    ipcRenderer.invoke('window:move', { deltaX, deltaY }) as Promise<void>,
}

export type DbdeskAPI = typeof dbdeskAPI
