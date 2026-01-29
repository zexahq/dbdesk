/**
 * Dashboard Store
 * Manages dashboard state using Zustand with YAML persistence support
 *
 * Flow:
 * - Load: Reads from YAML file into memory cache
 * - Save: Updates memory cache (fast)
 * - Persist: Writes memory cache to YAML file (on close/quit)
 */

import { create } from 'zustand'
import { dbdeskClient } from '@renderer/api/client'
import type { DashboardConfig, Widget } from '@common/types'

interface DashboardStore {
  // Current dashboard being edited
  currentDashboard: DashboardConfig | null
  isLoading: boolean
  error: string | null

  // All dashboards for the current connection
  dashboards: DashboardConfig[]

  // Current connection ID
  currentConnectionId: string | null

  // Local state actions
  setCurrentDashboard: (dashboard: DashboardConfig | null) => void
  setDashboards: (dashboards: DashboardConfig[]) => void
  updateDashboardWidgets: (widgets: Widget[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setCurrentConnectionId: (connectionId: string | null) => void
  reset: () => void

  // Persistence actions
  loadDashboards: (connectionId: string) => Promise<void>
  saveDashboard: (dashboard: DashboardConfig) => Promise<DashboardConfig>
  deleteDashboard: (connectionId: string, dashboardId: string) => Promise<boolean>

  // YAML file persistence
  persistDashboard: (dashboardId: string) => Promise<void>
  persistAllDashboards: () => Promise<void>

  // Export/Import actions (optional)
  exportDashboards: (
    connectionId?: string
  ) => Promise<{ version: string; exportedAt: string; dashboards: DashboardConfig[] }>
  importDashboards: (
    dashboards: DashboardConfig[],
    overwrite?: boolean
  ) => Promise<{ imported: number; skipped: number }>
}

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  currentDashboard: null,
  isLoading: false,
  error: null,
  dashboards: [],
  currentConnectionId: null,

  // Local state actions
  setCurrentDashboard: (dashboard) => set({ currentDashboard: dashboard }),

  setDashboards: (dashboards) => set({ dashboards }),

  updateDashboardWidgets: (widgets) =>
    set((state) => ({
      currentDashboard: state.currentDashboard
        ? { ...state.currentDashboard, widgets }
        : null
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  setCurrentConnectionId: (connectionId) => set({ currentConnectionId: connectionId }),

  reset: () =>
    set({
      currentDashboard: null,
      isLoading: false,
      error: null,
      dashboards: [],
      currentConnectionId: null
    }),

  // Persistence actions
  loadDashboards: async (connectionId: string) => {
    set({ isLoading: true, error: null, currentConnectionId: connectionId })
    try {
      const dashboards = await dbdeskClient.loadDashboards(connectionId)
      set({ dashboards, isLoading: false })
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to load dashboards'
      set({ error, isLoading: false })
    }
  },

  saveDashboard: async (dashboard: DashboardConfig) => {
    try {
      const saved = await dbdeskClient.saveDashboard(dashboard)

      // Update local state
      set((state) => {
        const index = state.dashboards.findIndex((d) => d.dashboardId === saved.dashboardId)
        const dashboards =
          index >= 0
            ? state.dashboards.map((d) => (d.dashboardId === saved.dashboardId ? saved : d))
            : [...state.dashboards, saved]

        return {
          dashboards,
          currentDashboard:
            state.currentDashboard?.dashboardId === saved.dashboardId
              ? saved
              : state.currentDashboard
        }
      })

      return saved
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to save dashboard'
      set({ error })
      throw err
    }
  },

  deleteDashboard: async (connectionId: string, dashboardId: string) => {
    try {
      const result = await dbdeskClient.deleteDashboard(connectionId, dashboardId)

      // Update local state
      set((state) => ({
        dashboards: state.dashboards.filter((d) => d.dashboardId !== dashboardId),
        currentDashboard:
          state.currentDashboard?.dashboardId === dashboardId ? null : state.currentDashboard
      }))

      return result
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to delete dashboard'
      set({ error })
      throw err
    }
  },

  // YAML file persistence
  persistDashboard: async (dashboardId: string) => {
    try {
      await dbdeskClient.persistDashboard(dashboardId)
    } catch (err) {
      console.error('Failed to persist dashboard:', err)
      throw err
    }
  },

  persistAllDashboards: async () => {
    try {
      await dbdeskClient.persistAllDashboards()
    } catch (err) {
      console.error('Failed to persist all dashboards:', err)
      throw err
    }
  },

  // Export/Import actions
  exportDashboards: async (connectionId?: string) => {
    return dbdeskClient.exportDashboards(connectionId)
  },

  importDashboards: async (dashboards: DashboardConfig[], overwrite?: boolean) => {
    const result = await dbdeskClient.importDashboards(dashboards, overwrite)

    // Reload dashboards if we have a current connection
    const { currentConnectionId } = get()
    if (currentConnectionId) {
      await get().loadDashboards(currentConnectionId)
    }

    return result
  }
}))
