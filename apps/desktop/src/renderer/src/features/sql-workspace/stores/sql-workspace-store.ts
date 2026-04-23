import type { ColumnInfo, SchemaWithTables } from '@dbdesk/shared/types'
import { create } from 'zustand'

interface SqlWorkspaceStore {
  currentConnectionId: string | null
  schemasWithTables: SchemaWithTables[]
  tableColumns: Record<string, ColumnInfo[]>

  setCurrentConnection: (connectionId: string | null) => void
  setSchemasWithTables: (schemas: SchemaWithTables[]) => void
  setTableColumns: (schema: string, table: string, columns: ColumnInfo[]) => void
  getTableColumns: (schema: string, table: string) => ColumnInfo[] | undefined
  reset: () => void
}

export const useSqlWorkspaceStore = create<SqlWorkspaceStore>((set, get) => ({
  currentConnectionId: null,
  schemasWithTables: [],
  tableColumns: {},

  setCurrentConnection: (connectionId) =>
    set((state) => {
      if (state.currentConnectionId === connectionId) {
        return state
      }

      return {
        currentConnectionId: connectionId,
        schemasWithTables: [],
        tableColumns: {}
      }
    }),
  setSchemasWithTables: (schemas) => set({ schemasWithTables: schemas }),
  setTableColumns: (schema, table, columns) =>
    set((state) => ({
      tableColumns: {
        ...state.tableColumns,
        [`${schema}.${table}`]: columns
      }
    })),
  getTableColumns: (schema, table) => get().tableColumns[`${schema}.${table}`],
  reset: () =>
    set({
      currentConnectionId: null,
      schemasWithTables: [],
      tableColumns: {}
    })
}))
