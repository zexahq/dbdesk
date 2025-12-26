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
  limit?: number
  offset?: number
}

export type SerializedTab = SerializedTableTab | SerializedQueryTab

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
  tabs: SerializedTab[]
  activeTabId: string | null
}

export interface WorkspaceStorage {
  [connectionId: string]: ConnectionWorkspace
}

export interface SavedQueriesStorage {
  [connectionId: string]: SavedQuery[]
}
