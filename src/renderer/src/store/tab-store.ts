import type { TableFilterCondition, TableSortRule } from '@common/types'
import type { CellPosition, UpdateCell } from '@renderer/types/data-table'
import type { ColumnSizingState, RowSelectionState, VisibilityState } from '@tanstack/react-table'
import { create } from 'zustand'

export interface Tab {
  id: string // unique tab identifier
  schema: string
  table: string

  // Tab-specific state
  view: 'tables' | 'structure'
  limit: number
  offset: number
  filters?: TableFilterCondition[]
  sortRules?: TableSortRule[]

  // Data table state (moved from global store)
  rowSelection: RowSelectionState
  columnSizing: ColumnSizingState
  columnVisibility: VisibilityState
  focusedCell: CellPosition | null
  editingCell: CellPosition | null
  pendingUpdates: UpdateCell[]
}

interface TabStore {
  tabs: Tab[]
  activeTabId: string | null

  // Actions
  addTab: (schema: string, table: string) => string // returns tab id
  removeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  updateTabState: (tabId: string, updates: Partial<Tab>) => void
  getTabBySchemaTable: (schema: string, table: string) => Tab | undefined
  getActiveTab: () => Tab | undefined
  reset: () => void
}

const createDefaultTab = (schema: string, table: string): Tab => ({
  id: `${schema}.${table}`,
  schema,
  table,
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

export const useTabStore = create<TabStore>((set, get) => ({
  tabs: [],
  activeTabId: null,

  addTab: (schema: string, table: string) => {
    const tabId = `${schema}.${table}`
    const existingTab = get().tabs.find((t) => t.id === tabId)

    if (existingTab) {
      // Tab already exists, just activate it
      set({ activeTabId: tabId })
      return tabId
    }

    // Create new tab
    const newTab = createDefaultTab(schema, table)
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: tabId
    }))

    return tabId
  },

  removeTab: (tabId: string) => {
    set((state) => {
      const newTabs = state.tabs.filter((t) => t.id !== tabId)
      let newActiveTabId = state.activeTabId

      // If we're closing the active tab, switch to another tab
      if (state.activeTabId === tabId) {
        if (newTabs.length > 0) {
          // Find the index of the closed tab
          const closedIndex = state.tabs.findIndex((t) => t.id === tabId)
          // Try to activate the next tab, or the previous one if it was the last tab
          const nextIndex = Math.min(closedIndex, newTabs.length - 1)
          newActiveTabId = newTabs[nextIndex]?.id || null
        } else {
          newActiveTabId = null
        }
      }

      return {
        tabs: newTabs,
        activeTabId: newActiveTabId
      }
    })
  },

  setActiveTab: (tabId: string) => {
    const tab = get().tabs.find((t) => t.id === tabId)
    if (tab) {
      set({ activeTabId: tabId })
    }
  },

  updateTabState: (tabId: string, updates: Partial<Tab>) => {
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, ...updates } : tab))
    }))
  },

  getTabBySchemaTable: (schema: string, table: string) => {
    const tabId = `${schema}.${table}`
    return get().tabs.find((t) => t.id === tabId)
  },

  getActiveTab: () => {
    const { tabs, activeTabId } = get()
    return tabs.find((t) => t.id === activeTabId)
  },

  reset: () => {
    set({
      tabs: [],
      activeTabId: null
    })
  }
}))
