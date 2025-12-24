import type { SchemaWithTables } from '@common/types'
import { create } from 'zustand'

interface SqlWorkspaceStore {
  currentConnectionId: string | null
  schemasWithTables: SchemaWithTables[]

  setCurrentConnection: (connectionId: string | null) => void
  setSchemasWithTables: (schemas: SchemaWithTables[]) => void
  reset: () => void
}

export const useSqlWorkspaceStore = create<SqlWorkspaceStore>((set) => ({
  currentConnectionId: null,
  schemasWithTables: [],

  setCurrentConnection: (connectionId) =>
    set({
      currentConnectionId: connectionId,
      schemasWithTables: []
    }),
  setSchemasWithTables: (schemas) => set({ schemasWithTables: schemas }),
  reset: () =>
    set({
      currentConnectionId: null,
      schemasWithTables: []
    })
}))
