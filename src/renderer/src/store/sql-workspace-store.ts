import type { SchemaWithTables } from '@common/types'
import { create } from 'zustand'

interface SqlWorkspaceStore {
  // Current selection
  currentConnectionId: string | null
  view: 'table' | 'query'

  // Data storage
  schemasWithTables: SchemaWithTables[] // schemas for the current connection

  // Actions
  setCurrentConnection: (connectionId: string | null) => void
  setSchemasWithTables: (schemas: SchemaWithTables[]) => void
  setView: (view: 'table' | 'query') => void
  reset: () => void
}

export const useSqlWorkspaceStore = create<SqlWorkspaceStore>((set) => ({
  // Initial state
  currentConnectionId: null,
  view: 'table',
  schemasWithTables: [],

  // Actions
  setCurrentConnection: (connectionId) =>
    set({
      currentConnectionId: connectionId,
      schemasWithTables: []
    }),
  setSchemasWithTables: (schemas) => set({ schemasWithTables: schemas }),
  setView: (view) => set({ view }),
  reset: () =>
    set({
      currentConnectionId: null,
      view: 'table',
      schemasWithTables: []
    })
}))
