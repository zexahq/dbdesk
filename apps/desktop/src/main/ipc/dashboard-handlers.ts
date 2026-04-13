import type { DashboardConfig } from '@dbdesk/shared/types'
import { ipcMain } from 'electron'
import {
  deleteDashboard,
  exportDashboards,
  getDashboard,
  importDashboards,
  loadDashboards,
  persistAllDashboards,
  persistDashboard,
  saveDashboard
} from '../dashboard-yaml-storage'
import { sanitizeError, ValidationError } from '../utils/errors'

function safeHandle<Payload = unknown, Result = unknown>(
  channel: string,
  handler: (payload: Payload) => Promise<Result> | Result
) {
  ipcMain.handle(channel, async (_event, payload: Payload) => {
    try {
      return await handler(payload)
    } catch (error) {
      console.error(`[IPC:${channel}]`, error)
      const sanitized = sanitizeError(error)
      const err = new Error(sanitized.message)
      err.name = sanitized.name
      throw err
    }
  })
}

export function registerDashboardHandlers() {
  safeHandle('dashboards:load', async ({ connectionId }: { connectionId: string }) => {
    if (!connectionId) throw new ValidationError('connectionId is required')
    return loadDashboards(connectionId)
  })

  safeHandle(
    'dashboards:get',
    async ({ connectionId, dashboardId }: { connectionId: string; dashboardId: string }) => {
      if (!connectionId) throw new ValidationError('connectionId is required')
      if (!dashboardId) throw new ValidationError('dashboardId is required')
      return getDashboard(connectionId, dashboardId)
    }
  )

  safeHandle('dashboards:save', async (dashboard: DashboardConfig) => {
    if (!dashboard || typeof dashboard !== 'object') {
      throw new ValidationError('Dashboard data is required')
    }
    if (!dashboard.dashboardId) throw new ValidationError('dashboardId is required')
    if (!dashboard.connectionId) throw new ValidationError('connectionId is required')
    if (!dashboard.name) throw new ValidationError('name is required')

    return saveDashboard({
      ...dashboard,
      createdAt: dashboard.createdAt ? new Date(dashboard.createdAt) : new Date(),
      updatedAt: dashboard.updatedAt ? new Date(dashboard.updatedAt) : new Date()
    })
  })

  safeHandle(
    'dashboards:delete',
    async ({ connectionId, dashboardId }: { connectionId: string; dashboardId: string }) => {
      if (!connectionId) throw new ValidationError('connectionId is required')
      if (!dashboardId) throw new ValidationError('dashboardId is required')
      return deleteDashboard(connectionId, dashboardId)
    }
  )

  safeHandle('dashboards:persist', async ({ dashboardId }: { dashboardId: string }) => {
    if (!dashboardId) throw new ValidationError('dashboardId is required')
    await persistDashboard(dashboardId)
  })

  safeHandle('dashboards:persist-all', async () => {
    await persistAllDashboards()
  })

  safeHandle('dashboards:export', async ({ connectionId }: { connectionId?: string } = {}) => {
    return exportDashboards(connectionId)
  })

  safeHandle(
    'dashboards:import',
    async ({
      dashboards,
      overwrite
    }: {
      dashboards: DashboardConfig[]
      overwrite?: boolean
    }) => {
      if (!Array.isArray(dashboards)) {
        throw new ValidationError('dashboards must be an array')
      }
      return importDashboards(dashboards, overwrite ?? false)
    }
  )
}