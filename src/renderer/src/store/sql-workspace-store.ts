import { create } from 'zustand'
import type { SchemaWithTables } from '@common/types'

interface SqlWorkspaceStore {
  // Current selection
  selectedSchema: string | null
  selectedTable: string | null
  currentConnectionId: string | null

  // Data storage
  schemasWithTables: SchemaWithTables[] // schemas for the current connection

  // Actions
  setSelectedSchema: (schema: string | null) => void
  setSelectedTable: (table: string | null) => void
  setCurrentConnection: (connectionId: string | null) => void
  setSchemasWithTables: (schemas: SchemaWithTables[]) => void
}

export const useSqlWorkspaceStore = create<SqlWorkspaceStore>((set) => ({
  // Initial state
  selectedSchema: null,
  selectedTable: null,
  currentConnectionId: null,
  schemasWithTables: [],

  // Actions
  setSelectedSchema: (schema) => set({ selectedSchema: schema }),
  setSelectedTable: (table) => set({ selectedTable: table }),
  setCurrentConnection: (connectionId) =>
    set({
      currentConnectionId: connectionId,
      selectedSchema: null,
      selectedTable: null,
      schemasWithTables: []
    }),
  setSchemasWithTables: (schemas) => set({ schemasWithTables: schemas })
}))
