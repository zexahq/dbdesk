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

const LOCAL_USER_ID = ''

export function registerDashboardHandlers() {
  typedHandle('dashboards:load', async ({ connectionId }) => {
    return loadDashboards(connectionId, LOCAL_USER_ID)
  })

  typedHandle('dashboards:get', async ({ connectionId, dashboardId }) => {
    return getDashboard(connectionId, dashboardId, LOCAL_USER_ID)
  })

  typedHandle('dashboards:save', async (dashboard) => {
    const userId = LOCAL_USER_ID
    const normalized: DashboardConfig = {
      ...(dashboard as DashboardConfig),
      userId,
      createdAt: dashboard.createdAt ? new Date(dashboard.createdAt) : new Date(),
      updatedAt: dashboard.updatedAt ? new Date(dashboard.updatedAt) : new Date()
    }
    return saveDashboard(normalized, userId)
  })

  typedHandle('dashboards:delete', async ({ connectionId, dashboardId }) => {
    return deleteDashboard(connectionId, dashboardId, LOCAL_USER_ID)
  })

  typedHandle('dashboards:persist', async ({ dashboardId }) => {
    await persistDashboard(dashboardId)
  })

  typedHandle('dashboards:persist-all', async () => {
    await persistAllDashboards()
  })

  typedHandle('dashboards:export', async (payload) => {
    return exportDashboards(LOCAL_USER_ID, payload?.connectionId)
  })

  typedHandle('dashboards:import', async ({ dashboards, overwrite }) => {
    const userId = LOCAL_USER_ID
    return importDashboards(dashboards as DashboardConfig[], userId, overwrite ?? false)
  })
}
