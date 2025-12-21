import type { QueryResult, SerializedQueryTab } from '@common/types'
import { create } from 'zustand'

export interface QueryTab {
  id: string // unique tab identifier (UUID, shared with SavedQuery.id when saved)
  name: string // tab name (e.g., "Untitled Query")
  editorContent: string // SQL query content in the editor
  queryResults?: QueryResult // query results
  lastSavedContent?: string // content at last save point (undefined = never saved)
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
  findTabById: (tabId: string) => QueryTab | undefined
  reset: () => void

  // Persistence methods
  loadFromSerialized: (serializedTabs: SerializedQueryTab[], activeTabId: string | null) => void
  serializeState: () => { tabs: SerializedQueryTab[]; activeTabId: string | null }
}

const createDefaultTab = (): QueryTab => {
  return {
    id: crypto.randomUUID(),
    name: 'Untitled Query',
    editorContent: '',
    queryResults: undefined,
    lastSavedContent: undefined
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
    set((state) => {
      const newTabs = state.tabs.map((tab) => (tab.id === tabId ? { ...tab, ...updates } : tab))
      // If we're changing the ID of the active tab, update activeTabId
      const newActiveTabId =
        state.activeTabId === tabId && updates.id ? updates.id : state.activeTabId
      return { tabs: newTabs, activeTabId: newActiveTabId }
    })
  },

  getActiveTab: () => {
    const { tabs, activeTabId } = get()
    return tabs.find((t) => t.id === activeTabId)
  },

  findTabById: (tabId: string) => {
    const { tabs } = get()
    return tabs.find((t) => t.id === tabId)
  },

  reset: () => {
    set({
      tabs: [],
      activeTabId: null
    })
  },

  // Persistence methods
  loadFromSerialized: (serializedTabs: SerializedQueryTab[], activeTabId: string | null) => {
    // Convert serialized tabs back to full QueryTab objects (without results)
    const tabs = serializedTabs.map((serializedTab) => ({
      ...serializedTab,
      queryResults: undefined,
      lastSavedContent: serializedTab.lastSavedContent
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
      editorContent: tab.editorContent,
      lastSavedContent: tab.lastSavedContent
      // Exclude queryResults as requested
    }))

    return { tabs: serializedTabs, activeTabId }
  }
}))