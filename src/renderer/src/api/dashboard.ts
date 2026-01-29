/**
 * Dashboard API
 * Functions for loading, saving, and managing dashboards
 * Uses the IPC-based persistence layer for local JSON and cloud storage
 */

import type { DashboardConfig, DashboardLayout, Widget } from '@common/types'
import { dbdeskClient } from './client'

/**
 * Generate a unique dashboard ID
 */
function generateDashboardId(): string {
  return `dashboard-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Load all dashboards for a connection
 */
export async function loadDashboards(connectionId: string): Promise<DashboardConfig[]> {
  return dbdeskClient.loadDashboards(connectionId)
}

/**
 * Load a specific dashboard by ID
 */
export async function loadDashboard(
  connectionId: string,
  dashboardId: string
): Promise<DashboardConfig | null> {
  const dashboard = await dbdeskClient.getDashboard(connectionId, dashboardId)
  return dashboard ?? null
}

/**
 * Create a new dashboard
 */
export async function createDashboard(
  connectionId: string,
  name: string,
  description?: string
): Promise<DashboardConfig> {
  const defaultLayout: DashboardLayout = {
    columns: 12,
    rowHeight: 80,
    margin: [16, 16],
    containerPadding: [0, 0]
  }

  const newDashboard: DashboardConfig = {
    dashboardId: generateDashboardId(),
    connectionId,
    name,
    description,
    layout: defaultLayout,
    widgets: [],
    createdAt: new Date(),
    updatedAt: new Date()
  }

  return dbdeskClient.saveDashboard(newDashboard)
}

/**
 * Save/update a dashboard
 */
export async function saveDashboard(config: DashboardConfig): Promise<DashboardConfig> {
  return dbdeskClient.saveDashboard(config)
}

/**
 * Update only the layout/widget positions of a dashboard
 */
export async function updateDashboardLayout(
  connectionId: string,
  dashboardId: string,
  widgets: Widget[]
): Promise<DashboardConfig | null> {
  const dashboard = await loadDashboard(connectionId, dashboardId)
  if (!dashboard) {
    return null
  }

  const updatedDashboard: DashboardConfig = {
    ...dashboard,
    widgets,
    updatedAt: new Date()
  }

  return saveDashboard(updatedDashboard)
}

/**
 * Delete a dashboard
 */
export async function deleteDashboard(
  connectionId: string,
  dashboardId: string
): Promise<boolean> {
  try {
    await dbdeskClient.deleteDashboard(connectionId, dashboardId)
    return true
  } catch {
    return false
  }
}

/**
 * Duplicate a dashboard
 */
export async function duplicateDashboard(
  connectionId: string,
  dashboardId: string,
  newName?: string
): Promise<DashboardConfig | null> {
  const dashboard = await loadDashboard(connectionId, dashboardId)
  if (!dashboard) {
    return null
  }

  const duplicatedDashboard: DashboardConfig = {
    ...dashboard,
    dashboardId: generateDashboardId(),
    name: newName ?? `${dashboard.name} (Copy)`,
    createdAt: new Date(),
    updatedAt: new Date(),
    // Clone widgets with new IDs
    widgets: dashboard.widgets.map((widget) => ({
      ...widget,
      id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }))
  }

  return saveDashboard(duplicatedDashboard)
}
