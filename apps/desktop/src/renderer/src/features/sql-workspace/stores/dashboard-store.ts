/**
 * Dashboard Store
 * Manages dashboard UI state using Zustand
 *
 * NOTE: This store focuses on UI state (current dashboard, mode, etc.)
 * Data fetching/caching should use TanStack Query directly in components.
 * The store provides mutation helpers that work with the query cache and
 * automatically invalidate the dashboard list query key after mutations.
 */

import { create } from 'zustand'
import { dbdeskClient } from '@renderer/api/client'
import { createId } from '@renderer/lib/utils'
import { queryClient } from '@renderer/shared/lib/query-client'
import type { DashboardConfig, Widget } from '@common/types'

// Query key constant for consistency across the app
export const DASHBOARD_QUERY_KEYS = {
  list: (connectionId: string) => ['dashboards', connectionId] as const,
  detail: (connectionId: string, dashboardId: string) =>
    ['dashboard', connectionId, dashboardId] as const
}

interface DashboardStore {
  // Current dashboard being edited/viewed
  currentDashboard: DashboardConfig | null

  // UI state
  isLoading: boolean
  error: string | null

  // Local state actions
  setCurrentDashboard: (dashboard: DashboardConfig | null) => void
  updateCurrentDashboardWidgets: (widgets: Widget[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void

  // Mutation helpers (not for data fetching - use TanStack Query for that)
  createDashboard: (
    connectionId: string,
    name: string,
    description?: string
  ) => Promise<DashboardConfig>
  saveDashboard: (dashboard: DashboardConfig) => Promise<DashboardConfig>
  deleteDashboard: (connectionId: string, dashboardId: string) => Promise<boolean>

  // Persistence compatibility hooks (used during app close/quit flows)
  persistDashboard: (dashboardId: string) => Promise<void>
  persistAllDashboards: () => Promise<void>

  // Export/Import
  exportDashboards: (
    connectionId?: string
  ) => Promise<{ version: string; exportedAt: string; dashboards: DashboardConfig[] }>
  importDashboards: (
    dashboards: DashboardConfig[],
    overwrite?: boolean
  ) => Promise<{ imported: number; skipped: number }>
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  currentDashboard: null,
  isLoading: false,
  error: null,

  // Local state actions
  setCurrentDashboard: (dashboard) => set({ currentDashboard: dashboard, error: null }),

  updateCurrentDashboardWidgets: (widgets) =>
    set((state) => ({
      currentDashboard: state.currentDashboard
        ? { ...state.currentDashboard, widgets, updatedAt: new Date() }
        : null
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  reset: () =>
    set({
      currentDashboard: null,
      isLoading: false,
      error: null
    }),

  // Mutation helpers
  createDashboard: async (connectionId: string, name: string, description?: string) => {
    const now = new Date()
    const newDashboard: DashboardConfig = {
      dashboardId: createId('dashboard'),
      connectionId,
      name,
      description,
      layout: {
        columns: 12,
        rowHeight: 80,
        margin: [16, 16],
        containerPadding: [0, 0]
      },
      widgets: [],
      createdAt: now,
      updatedAt: now
    }

    try {
      const saved = await dbdeskClient.saveDashboard(newDashboard)
      set({ currentDashboard: saved, error: null })
      queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEYS.list(connectionId) })
      return saved
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to create dashboard'
      set({ error })
      throw err
    }
  },

  saveDashboard: async (dashboard: DashboardConfig) => {
    try {
      const saved = await dbdeskClient.saveDashboard(dashboard)

      // Update current dashboard if it's the one being saved
      set((state) => ({
        currentDashboard:
          state.currentDashboard?.dashboardId === saved.dashboardId
            ? saved
            : state.currentDashboard,
        error: null
      }))

      queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEYS.list(dashboard.connectionId) })
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

      // Clear current dashboard if it was deleted
      set((state) => ({
        currentDashboard:
          state.currentDashboard?.dashboardId === dashboardId ? null : state.currentDashboard,
        error: null
      }))

      queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEYS.list(connectionId) })
      return result
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to delete dashboard'
      set({ error })
      throw err
    }
  },

  // Persistence compatibility hooks
  persistDashboard: async (dashboardId: string) => {
    await dbdeskClient.persistDashboard(dashboardId)
  },

  persistAllDashboards: async () => {
    await dbdeskClient.persistAllDashboards()
  },

  // Export/Import
  exportDashboards: (connectionId?: string) => dbdeskClient.exportDashboards(connectionId),

  importDashboards: (dashboards: DashboardConfig[], overwrite?: boolean) =>
    dbdeskClient.importDashboards(dashboards, overwrite)
}))
