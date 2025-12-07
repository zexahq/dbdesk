import type { SerializedTab, TableFilterCondition, TableSortRule } from '@common/types'
import type { CellPosition, UpdateCell } from '@renderer/types/data-table'
import type { ColumnSizingState, RowSelectionState, VisibilityState } from '@tanstack/react-table'
import { create } from 'zustand'

export interface Tab {
  id: string // unique tab identifier
  schema: string
  table: string
  isTemporary: boolean // whether this tab is temporary (will be replaced on next table click)

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
  makeTabPermanent: (tabId: string) => void
  getTabBySchemaTable: (schema: string, table: string) => Tab | undefined
  getActiveTab: () => Tab | undefined
  reset: () => void

  // Persistence methods
  loadFromSerialized: (serializedTabs: SerializedTab[], activeTabId: string | null) => void
  serializeState: () => { tabs: SerializedTab[]; activeTabId: string | null }
}

const createDefaultTab = (schema: string, table: string, isTemporary = true): Tab => ({
  id: `${schema}.${table}`,
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

    // Find any existing temporary tab
    const temporaryTab = get().tabs.find((t) => t.isTemporary)

    if (temporaryTab) {
      // Replace the temporary tab with the new table
      const newTab = createDefaultTab(schema, table, true)
      set((state) => ({
        tabs: state.tabs.map((t) => (t.id === temporaryTab.id ? newTab : t)),
        activeTabId: tabId
      }))
      return tabId
    }

    // No temporary tab exists, create new temporary tab
    const newTab = createDefaultTab(schema, table, true)
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
    // Any update to tab state makes it permanent
    get().makeTabPermanent(tabId)

    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, ...updates } : tab))
    }))
  },

  makeTabPermanent: (tabId: string) => {
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, isTemporary: false } : tab))
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
  },

  // Persistence methods
  loadFromSerialized: (serializedTabs: SerializedTab[], activeTabId: string | null) => {
    // Convert serialized tabs back to full Tab objects with default UI state
    const tabs = serializedTabs.map((serializedTab) => ({
      ...serializedTab,
      // Restore UI state with defaults (these don't persist)
      rowSelection: {},
      columnSizing: {},
      columnVisibility: {},
      focusedCell: null,
      editingCell: null,
      pendingUpdates: []
    }))

    set({
      tabs,
      activeTabId
    })
  },

  serializeState: () => {
    const { tabs, activeTabId } = get()

    // Only serialize the persisted state, exclude UI state
    const serializedTabs: SerializedTab[] = tabs.map((tab) => ({
      id: tab.id,
      schema: tab.schema,
      table: tab.table,
      isTemporary: tab.isTemporary,
      view: tab.view,
      limit: tab.limit,
      offset: tab.offset,
      filters: tab.filters,
      sortRules: tab.sortRules
    }))

    return { tabs: serializedTabs, activeTabId }
  }
}))
