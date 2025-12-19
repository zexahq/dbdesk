import type { TableFilterCondition, TableSortRule } from './sql'

export interface SerializedTab {
  id: string
  schema: string
  table: string
  isTemporary: boolean
  view: 'tables' | 'structure'
  limit: number
  offset: number
  filters?: TableFilterCondition[]
  sortRules?: TableSortRule[]
}

export interface SerializedQueryTab {
  id: string
  name: string
  editorContent: string
}

export interface SavedQuery {
  id: string
  name: string
  content: string
  createdAt: Date
  updatedAt: Date
}

export interface ConnectionWorkspace {
  connectionId: string
  lastUpdated: Date
  tableTabs: SerializedTab[]
  activeTableTabId: string | null
  queryTabs: SerializedQueryTab[]
  activeQueryTabId: string | null
  workspaceView: 'table' | 'query'
}

export interface WorkspaceStorage {
  [connectionId: string]: ConnectionWorkspace
}

export interface SavedQueriesStorage {
  [connectionId: string]: SavedQuery[]
}
