import type {
  QueryResult,
  SerializedQueryTab,
  SerializedTab,
  SerializedTableTab,
  TableFilterCondition,
  TableSortRule
} from '@common/types'
import type { CellPosition, UpdateCell } from '@renderer/types/data-table'
import type { ColumnSizingState, RowSelectionState, VisibilityState } from '@tanstack/react-table'
import { create } from 'zustand'

export interface BaseTab {
  id: string
  kind: 'table' | 'query'
  isTemporary: boolean
}

export interface TableTab extends BaseTab {
  kind: 'table'
  schema: string
  table: string
  view: 'tables' | 'structure'
  limit: number
  offset: number
  filters?: TableFilterCondition[]
  sortRules?: TableSortRule[]
  rowSelection: RowSelectionState
  columnSizing: ColumnSizingState
  columnVisibility: VisibilityState
  focusedCell: CellPosition | null
  editingCell: CellPosition | null
  pendingUpdates: UpdateCell[]
}

export interface QueryTab extends BaseTab {
  kind: 'query'
  name: string
  editorContent: string
  lastSavedContent?: string
  queryResults?: QueryResult
}

export type Tab = TableTab | QueryTab

interface TabStore {
  tabs: Tab[]
  activeTabId: string | null

  // Common actions
  removeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  getActiveTab: () => Tab | undefined
  reset: () => void
  moveTab: (fromIndex: number, toIndex: number) => void

  // Table-specific actions
  addTableTab: (schema: string, table: string) => string
  updateTableTab: (tabId: string, updates: Partial<Omit<TableTab, 'kind'>>) => void
  makeTabPermanent: (tabId: string) => void
  getTableTabBySchemaTable: (schema: string, table: string) => TableTab | undefined

  // Query-specific actions
  addQueryTab: () => string
  updateQueryTab: (tabId: string, updates: Partial<Omit<QueryTab, 'kind'>>) => void
  findQueryTabById: (tabId: string) => QueryTab | undefined

  // Persistence
  loadFromSerialized: (tabs: SerializedTab[], activeTabId: string | null) => void
  serializeState: () => { tabs: SerializedTab[]; activeTabId: string | null }
}

const createDefaultTableTab = (schema: string, table: string, isTemporary = true): TableTab => ({
  id: `${schema}.${table}`,
  kind: 'table',
  schema,
  table,
  isTemporary,
  view: 'tables',
  limit: 50,
  offset: 0,
  filters: undefined,
  sortRules: undefined,
  rowSelection: {},
  columnSizing: {},
  columnVisibility: {},
  focusedCell: null,
  editingCell: null,
  pendingUpdates: []
})

const createDefaultQueryTab = (): QueryTab => ({
  id: crypto.randomUUID(),
  kind: 'query',
  name: 'Untitled Query',
  editorContent: '',
  isTemporary: true,
  queryResults: undefined,
  lastSavedContent: undefined
})

export const useTabStore = create<TabStore>((set, get) => ({
  tabs: [],
  activeTabId: null,

  // Common actions
  removeTab: (tabId: string) => {
    set((state) => {
      const newTabs = state.tabs.filter((t) => t.id !== tabId)
      let newActiveTabId = state.activeTabId

      if (state.activeTabId === tabId) {
        if (newTabs.length > 0) {
          const closedIndex = state.tabs.findIndex((t) => t.id === tabId)
          const nextIndex = Math.min(closedIndex, newTabs.length - 1)
          newActiveTabId = newTabs[nextIndex]?.id || null
        } else {
          newActiveTabId = null
        }
      }

      return { tabs: newTabs, activeTabId: newActiveTabId }
    })
  },

  setActiveTab: (tabId: string) => {
    const tab = get().tabs.find((t) => t.id === tabId)
    if (tab) {
      set({ activeTabId: tabId })
    }
  },

  getActiveTab: () => {
    const { tabs, activeTabId } = get()
    return tabs.find((t) => t.id === activeTabId)
  },

  reset: () => {
    set({ tabs: [], activeTabId: null })
  },

  moveTab: (fromIndex: number, toIndex: number) => {
    set((state) => {
      const newTabs = [...state.tabs]
      const [movedTab] = newTabs.splice(fromIndex, 1)
      newTabs.splice(toIndex, 0, movedTab)
      return { tabs: newTabs }
    })
  },

  // Table-specific actions
  addTableTab: (schema: string, table: string) => {
    const tabId = `${schema}.${table}`
    const existingTab = get().tabs.find((t) => t.id === tabId)

    if (existingTab) {
      set({ activeTabId: tabId })
      return tabId
    }

    const temporaryTableTab = get().tabs.find((t) => t.kind === 'table' && t.isTemporary)

    if (temporaryTableTab) {
      const newTab = createDefaultTableTab(schema, table, true)
      set((state) => ({
        tabs: state.tabs.map((t) => (t.id === temporaryTableTab.id ? newTab : t)),
        activeTabId: tabId
      }))
      return tabId
    }

    const newTab = createDefaultTableTab(schema, table, true)
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: tabId
    }))

    return tabId
  },

  updateTableTab: (tabId: string, updates: Partial<Omit<TableTab, 'kind'>>) => {
    get().makeTabPermanent(tabId)

    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId && tab.kind === 'table' ? { ...tab, ...updates } : tab
      )
    }))
  },

  makeTabPermanent: (tabId: string) => {
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, isTemporary: false } : tab))
    }))
  },

  getTableTabBySchemaTable: (schema: string, table: string) => {
    const tabId = `${schema}.${table}`
    const tab = get().tabs.find((t) => t.id === tabId)
    return tab?.kind === 'table' ? tab : undefined
  },

  // Query-specific actions
  addQueryTab: () => {
    const newTab = createDefaultQueryTab()
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id
    }))
    return newTab.id
  },

  updateQueryTab: (tabId: string, updates: Partial<Omit<QueryTab, 'kind'>>) => {
    set((state) => {
      const newTabs = state.tabs.map((tab) =>
        tab.id === tabId && tab.kind === 'query' ? { ...tab, ...updates } : tab
      )
      const newActiveTabId =
        state.activeTabId === tabId && updates.id ? updates.id : state.activeTabId
      return { tabs: newTabs, activeTabId: newActiveTabId }
    })
  },

  findQueryTabById: (tabId: string) => {
    const tab = get().tabs.find((t) => t.id === tabId)
    return tab?.kind === 'query' ? tab : undefined
  },

  // Persistence
  loadFromSerialized: (serializedTabs: SerializedTab[], activeTabId: string | null) => {
    const tabs: Tab[] = serializedTabs.map((serializedTab) => {
      if (serializedTab.kind === 'table') {
        return {
          ...serializedTab,
          rowSelection: {},
          columnSizing: {},
          columnVisibility: {},
          focusedCell: null,
          editingCell: null,
          pendingUpdates: []
        } as TableTab
      } else {
        return {
          ...serializedTab,
          queryResults: undefined
        } as QueryTab
      }
    })

    set({ tabs, activeTabId })
  },

  serializeState: () => {
    const { tabs, activeTabId } = get()

    const serializedTabs: SerializedTab[] = tabs.map((tab) => {
      if (tab.kind === 'table') {
        return {
          kind: 'table',
          id: tab.id,
          schema: tab.schema,
          table: tab.table,
          isTemporary: tab.isTemporary,
          view: tab.view,
          limit: tab.limit,
          offset: tab.offset,
          filters: tab.filters,
          sortRules: tab.sortRules
        } as SerializedTableTab
      } else {
        return {
          kind: 'query',
          id: tab.id,
          name: tab.name,
          editorContent: tab.editorContent,
          isTemporary: tab.isTemporary,
          lastSavedContent: tab.lastSavedContent
        } as SerializedQueryTab
      }
    })

    return { tabs: serializedTabs, activeTabId }
  }
}))
