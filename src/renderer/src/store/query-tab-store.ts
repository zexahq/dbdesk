import type { QueryResult, SerializedQueryTab } from '@common/types'
import { create } from 'zustand'

export interface QueryTab {
  id: string // unique tab identifier
  name: string // tab name (e.g., "Untitled Query")
  editorContent: string // SQL query content in the editor
  queryResults?: QueryResult // query results
  savedQueryId?: string // ID of the saved query (if opened from saved queries)
}

interface QueryTabStore {
  tabs: QueryTab[]
  activeTabId: string | null

  // Actions
  addTab: (savedQueryId?: string) => string // returns tab id
  removeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  updateTab: (tabId: string, updates: Partial<QueryTab>) => void
  getActiveTab: () => QueryTab | undefined
  findTabBySavedQueryId: (savedQueryId: string) => QueryTab | undefined
  reset: () => void

  // Persistence methods
  loadFromSerialized: (serializedTabs: SerializedQueryTab[], activeTabId: string | null) => void
  serializeState: () => { tabs: SerializedQueryTab[]; activeTabId: string | null }
}

let tabCounter = 1

const createDefaultTab = (savedQueryId?: string): QueryTab => {
  const tabNumber = tabCounter++
  return {
    id: `query-${tabNumber}`,
    name: 'Untitled Query',
    editorContent: '',
    queryResults: undefined,
    savedQueryId
  }
}

export const useQueryTabStore = create<QueryTabStore>((set, get) => ({
  tabs: [],
  activeTabId: null,

  addTab: (savedQueryId?: string) => {
    const newTab = createDefaultTab(savedQueryId)
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

  findTabBySavedQueryId: (savedQueryId: string) => {
    const { tabs } = get()
    return tabs.find((t) => t.savedQueryId === savedQueryId)
  },

  reset: () => {
    tabCounter = 1
    set({
      tabs: [],
      activeTabId: null
    })
  },

  // Persistence methods
  loadFromSerialized: (serializedTabs: SerializedQueryTab[], activeTabId: string | null) => {
    // Update the tab counter based on existing tabs to avoid ID conflicts
    const maxTabNumber = serializedTabs.reduce((max, tab) => {
      const match = tab.id.match(/query-(\d+)/)
      if (match) {
        return Math.max(max, parseInt(match[1], 10))
      }
      return max
    }, 0)
    tabCounter = maxTabNumber + 1

    // Convert serialized tabs back to full QueryTab objects (without results)
    const tabs = serializedTabs.map((serializedTab) => ({
      ...serializedTab,
      queryResults: undefined // Results are not persisted
    }))

    set({
      tabs,
      activeTabId
    })
  },

  serializeState: () => {
    const { tabs, activeTabId } = get()

    // Only serialize the persisted state, exclude query results
    const serializedTabs: SerializedQueryTab[] = tabs.map((tab) => ({
      id: tab.id,
      name: tab.name,
      editorContent: tab.editorContent
      // Exclude queryResults as requested
    }))

    return { tabs: serializedTabs, activeTabId }
  }
}))
