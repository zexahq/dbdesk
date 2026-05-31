import type { DashboardConfig } from '@dbdesk/shared/types'
import {
  deleteDashboard,
  exportDashboards,
  getDashboard,
  importDashboards,
  loadDashboards,
  persistAllDashboards,
  persistDashboard,
  saveDashboard
} from '../dashboard-storage'
import { typedHandle } from './typed-handle'

export function registerDashboardHandlers() {
  typedHandle('dashboards:load', async ({ connectionId }) => {
    return loadDashboards(connectionId)
  })

  typedHandle('dashboards:get', async ({ connectionId, dashboardId }) => {
    return getDashboard(connectionId, dashboardId)
  })

  typedHandle('dashboards:save', async (dashboard) => {
    const normalized: DashboardConfig = {
      ...(dashboard as DashboardConfig),
      createdAt: dashboard.createdAt ? new Date(dashboard.createdAt) : new Date(),
      updatedAt: dashboard.updatedAt ? new Date(dashboard.updatedAt) : new Date()
    }
    return saveDashboard(normalized)
  })

  typedHandle('dashboards:delete', async ({ connectionId, dashboardId }) => {
    return deleteDashboard(connectionId, dashboardId)
  })

  typedHandle('dashboards:persist', async ({ dashboardId }) => {
    await persistDashboard(dashboardId)
  })

  typedHandle('dashboards:persist-all', async () => {
    await persistAllDashboards()
  })

  typedHandle('dashboards:export', async (payload) => {
    return exportDashboards(payload?.connectionId)
  })

  typedHandle('dashboards:import', async ({ dashboards, overwrite }) => {
    return importDashboards(dashboards as DashboardConfig[], overwrite ?? false)
  })
}
