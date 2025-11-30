import type { QueryResult } from '@common/types'
import { create } from 'zustand'

export interface QueryTab {
  id: string // unique tab identifier
  name: string // tab name (e.g., "Query 1", "Query 2")
  editorContent: string // SQL query content in the editor
  queryResults?: QueryResult // query results
}

interface QueryTabStore {
  tabs: QueryTab[]
  activeTabId: string | null

  // Actions
  addTab: () => string // returns tab id
  removeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  updateTab: (tabId: string, updates: Partial<QueryTab>) => void
  getActiveTab: () => QueryTab | undefined
  reset: () => void
}

let tabCounter = 1

const createDefaultTab = (): QueryTab => {
  const tabNumber = tabCounter++
  return {
    id: `query-${tabNumber}`,
    name: `Query ${tabNumber}`,
    editorContent: '',
    queryResults: undefined
  }
}

export const useQueryTabStore = create<QueryTabStore>((set, get) => ({
  tabs: [],
  activeTabId: null,

  addTab: () => {
    const newTab = createDefaultTab()
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id
    }))
    return newTab.id
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

  updateTab: (tabId: string, updates: Partial<QueryTab>) => {
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, ...updates } : tab))
    }))
  },

  getActiveTab: () => {
    const { tabs, activeTabId } = get()
    return tabs.find((t) => t.id === activeTabId)
  },

  reset: () => {
    tabCounter = 1
    set({
      tabs: [],
      activeTabId: null
    })
  }
}))
