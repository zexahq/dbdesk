import type { TableFilterCondition, TableSortRule } from './sql'

export interface SerializedTableTab {
  kind: 'table'
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
  kind: 'query'
  id: string
  name: string
  editorContent: string
  isTemporary: boolean
  lastSavedContent?: string
}

export interface SerializedDashboardTab {
  kind: 'dashboard'
  id: string
  dashboardId: string
  name: string
}

export type SerializedTab = SerializedTableTab | SerializedQueryTab | SerializedDashboardTab

export interface SavedQuery {
  id: string
  name: string
  content: string
}

export interface ConnectionWorkspace {
  connectionId: string
  tabs: SerializedTab[]
  activeTabId: string | null
}

export interface WorkspaceStorage {
  [connectionId: string]: ConnectionWorkspace
}

export interface SavedQueriesStorage {
  [connectionId: string]: SavedQuery[]
}
