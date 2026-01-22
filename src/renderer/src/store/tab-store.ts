import type {
  QueryResult,
  SerializedQueryTab,
  SerializedTab,
  SerializedTableTab,
  TableFilterCondition,
  TableSortRule
} from '@common/types'
import { create } from 'zustand'

export interface BaseTab {
  id: string
  kind: 'table' | 'query'
}

export interface TableTab extends BaseTab {
  kind: 'table'
  schema: string
  table: string
  isTemporary: boolean
  view: 'tables' | 'structure'
  limit: number
  offset: number
  filters?: TableFilterCondition[]
  sortRules?: TableSortRule[]
  origin?: { rowIndex: number; columnId: string }
}

export interface QueryTab extends BaseTab {
  kind: 'query'
  name: string
  editorContent: string
  limit: number
  offset: number
  totalRowCount?: number
  lastSavedContent?: string
  queryResults?: QueryResult
  isDirty: boolean
}

export type Tab = TableTab | QueryTab

interface TabStore {
  tabs: Tab[]
  activeTabId: string | null

  // Common actions
  removeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  reset: () => void
  moveTab: (fromIndex: number, toIndex: number) => void

  // Table-specific actions
  addTableTab: (schema: string, table: string) => string
  updateTableTab: (tabId: string, updates: Partial<Omit<TableTab, 'kind'>>) => void
  makeTabPermanent: (tabId: string) => void
  updateTableOrigin: (tabId: string, origin: { rowIndex: number; columnId: string } | undefined) => void
  getTableTabBySchemaTable: (schema: string, table: string) => TableTab | undefined
  findTableTabById: (tabId: string) => TableTab | undefined

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
  origin: undefined
})

const createDefaultQueryTab = (): QueryTab => ({
  id: crypto.randomUUID(),
  kind: 'query',
  name: 'Untitled Query',
  editorContent: '',
  limit: 50,
  offset: 0,
  queryResults: undefined,
  lastSavedContent: undefined,
  isDirty: false
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
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId && tab.kind === 'table' ? { ...tab, ...updates, isTemporary: false } : tab
      )
    }))
  },

  makeTabPermanent: (tabId: string) => {
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, isTemporary: false } : tab))
    }))
  },

  updateTableOrigin: (tabId: string, origin: { rowIndex: number; columnId: string } | undefined) => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId && tab.kind === 'table' ? { ...tab, origin } : tab
      )
    }))
  },

  getTableTabBySchemaTable: (schema: string, table: string) => {
    const tabId = `${schema}.${table}`
    const tab = get().tabs.find((t) => t.id === tabId)
    return tab?.kind === 'table' ? tab : undefined
  },

  findTableTabById: (tabId: string) => {
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
      const newTabs = state.tabs.map((tab) => {
        if (tab.id !== tabId || tab.kind !== 'query') {
          return tab
        }
        const next: QueryTab = { ...tab, ...updates }
        const lastSaved = next.lastSavedContent ?? ''
        const current = next.editorContent ?? ''
        next.isDirty =
          next.lastSavedContent !== undefined ? current !== lastSaved : current.trim().length > 0
        return next
      })
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
          ...serializedTab
        } as TableTab
      } else {
        const lastSaved = serializedTab.lastSavedContent ?? ''
        const current = serializedTab.editorContent ?? ''
        const isDirty =
          serializedTab.lastSavedContent !== undefined
            ? current !== lastSaved
            : current.trim().length > 0
        return {
          ...serializedTab,
          limit: 50,
          offset: 0,
          queryResults: undefined,
          isDirty
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
          isTemporary: false,
          lastSavedContent: tab.lastSavedContent
        } as SerializedQueryTab
      }
    })

    return { tabs: serializedTabs, activeTabId }
  }
}))

// Custom hooks for idiomatic selector usage
export const useActiveTab = () =>
  useTabStore((s) => s.tabs.find((t) => t.id === s.activeTabId) ?? null)
