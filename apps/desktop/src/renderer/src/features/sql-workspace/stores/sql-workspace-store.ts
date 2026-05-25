import type { SchemaWithTables } from '@dbdesk/shared/types'
import { create } from 'zustand'

export type SidebarViewMode = 'schemas' | 'queries' | 'dashboards'

interface SqlWorkspaceStore {
  currentConnectionId: string | null
  schemasWithTables: SchemaWithTables[]
  sidebarViewMode: SidebarViewMode

  setCurrentConnection: (connectionId: string | null) => void
  setSchemasWithTables: (schemas: SchemaWithTables[]) => void
  setSidebarViewMode: (mode: SidebarViewMode) => void
  reset: () => void
}

export const useSqlWorkspaceStore = create<SqlWorkspaceStore>((set) => ({
  currentConnectionId: null,
  schemasWithTables: [],
  sidebarViewMode: 'schemas',

  setCurrentConnection: (connectionId) =>
    set((state) => {
      if (state.currentConnectionId === connectionId) {
        return state
      }

      return {
        currentConnectionId: connectionId,
        schemasWithTables: []
      }
    }),
  setSchemasWithTables: (schemas) => set({ schemasWithTables: schemas }),
  setSidebarViewMode: (mode) => set({ sidebarViewMode: mode }),
  reset: () =>
    set({
      currentConnectionId: null,
      schemasWithTables: [],
      sidebarViewMode: 'schemas'
    })
}))
