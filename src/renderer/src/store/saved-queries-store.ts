import type { SavedQuery } from '@common/types'
import { dbdeskClient } from '@renderer/api/client'
import { create } from 'zustand'

interface SavedQueriesStore {
  queries: SavedQuery[]
  isLoading: boolean
  error: string | null

  // Actions
  loadQueries: (connectionId: string) => Promise<void>
  saveQuery: (connectionId: string, name: string, content: string) => Promise<SavedQuery>
  deleteQuery: (connectionId: string, queryId: string) => Promise<void>
  updateQuery: (
    connectionId: string,
    queryId: string,
    name: string,
    content: string
  ) => Promise<SavedQuery | undefined>
  reset: () => void
}

export const useSavedQueriesStore = create<SavedQueriesStore>((set) => ({
  queries: [],
  isLoading: false,
  error: null,

  loadQueries: async (connectionId: string) => {
    set({ isLoading: true, error: null })
    try {
      const queries = await dbdeskClient.loadQueries(connectionId)
      set({ queries, isLoading: false })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load queries'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  saveQuery: async (connectionId: string, name: string, content: string) => {
    try {
      const query = await dbdeskClient.saveQuery(connectionId, name, content)
      set((state) => ({
        queries: [...state.queries, query]
      }))
      return query
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save query'
      set({ error: message })
      throw error
    }
  },

  deleteQuery: async (connectionId: string, queryId: string) => {
    try {
      await dbdeskClient.deleteQuery(connectionId, queryId)
      set((state) => ({
        queries: state.queries.filter((q) => q.id !== queryId)
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete query'
      set({ error: message })
      throw error
    }
  },

  updateQuery: async (
    connectionId: string,
    queryId: string,
    name: string,
    content: string
  ) => {
    try {
      const query = await dbdeskClient.updateQuery(connectionId, queryId, name, content)

      if (query) {
        set((state) => ({
          queries: state.queries.map((q) => (q.id === queryId ? query : q))
        }))
      }

      return query
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update query'
      set({ error: message })
      throw error
    }
  },

  reset: () => {
    set({
      queries: [],
      isLoading: false,
      error: null
    })
  }
}))
