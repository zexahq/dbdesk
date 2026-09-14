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
import { ValidationError } from '../utils/errors'
import { typedHandle } from './typed-handle'

const getAuthenticatedUserId = async (): Promise<string> => {
  const userId = (await authManager.getSession())?.user?.id
  if (!userId) {
    throw new ValidationError('You must be signed in to manage dashboards')
  }
  return userId
}

export function registerDashboardHandlers() {
  typedHandle('dashboards:load', async ({ connectionId }) => {
    return loadDashboards(connectionId, await getAuthenticatedUserId())
  })

  typedHandle('dashboards:get', async ({ connectionId, dashboardId }) => {
    return getDashboard(connectionId, dashboardId, await getAuthenticatedUserId())
  })

  typedHandle('dashboards:save', async (dashboard) => {
    const userId = await getAuthenticatedUserId()
    const normalized: DashboardConfig = {
      ...(dashboard as DashboardConfig),
      userId,
      createdAt: dashboard.createdAt ? new Date(dashboard.createdAt) : new Date(),
      updatedAt: dashboard.updatedAt ? new Date(dashboard.updatedAt) : new Date()
    }
    return saveDashboard(normalized, userId)
  })

  typedHandle('dashboards:delete', async ({ connectionId, dashboardId }) => {
    return deleteDashboard(connectionId, dashboardId, await getAuthenticatedUserId())
  })

  typedHandle('dashboards:persist', async ({ dashboardId }) => {
    await persistDashboard(dashboardId)
  })

  typedHandle('dashboards:persist-all', async () => {
    await persistAllDashboards()
  })

  typedHandle('dashboards:export', async (payload) => {
    return exportDashboards(await getAuthenticatedUserId(), payload?.connectionId)
  })

  typedHandle('dashboards:import', async ({ dashboards, overwrite }) => {
    const userId = await getAuthenticatedUserId()
    return importDashboards(dashboards as DashboardConfig[], userId, overwrite ?? false)
  })
}
