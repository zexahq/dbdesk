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
import { authManager } from '../lib/auth-manager'
import { typedHandle } from './typed-handle'

export function registerDashboardHandlers() {
  typedHandle('dashboards:load', async ({ connectionId }) => {
    return loadDashboards(connectionId)
  })

  typedHandle('dashboards:get', async ({ connectionId, dashboardId }) => {
    return getDashboard(connectionId, dashboardId)
  })

  typedHandle('dashboards:save', async (dashboard) => {
    const session = await authManager.getSession()
    const normalized: DashboardConfig = {
      ...(dashboard as DashboardConfig),
      userId: (dashboard as DashboardConfig).userId ?? session?.user?.id,
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
    const session = await authManager.getSession()
    const userId = session?.user?.id
    const stamped = (dashboards as DashboardConfig[]).map((dashboard) => ({
      ...dashboard,
      userId: dashboard.userId ?? userId
    }))
    return importDashboards(stamped, overwrite ?? false)
  })
}
