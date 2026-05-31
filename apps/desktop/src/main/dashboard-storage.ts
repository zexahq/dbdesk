/**
 * Dashboard Storage Module
 *
 * SQLite-backed persistence for dashboard configurations using Drizzle ORM.
 * Layout and widgets are stored as JSON columns in the `dashboards` table.
 */

import { and, eq, getDb, dashboards } from '@dbdesk/db'
import { dashboardConfigSchema } from '@dbdesk/shared/schemas'
import type { DashboardConfig } from '@common/types'

const STORAGE_VERSION = '1.0.0'

type DashboardRow = typeof dashboards.$inferSelect

const rowToDashboard = (row: DashboardRow): DashboardConfig => {
  const parsed = dashboardConfigSchema.parse({
    dashboardId: row.dashboardId,
    connectionId: row.connectionId,
    name: row.name,
    description: row.description ?? undefined,
    layout: JSON.parse(row.layoutJson),
    widgets: JSON.parse(row.widgetsJson),
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString()
  })

  return {
    dashboardId: parsed.dashboardId,
    connectionId: parsed.connectionId,
    name: parsed.name,
    description: parsed.description,
    layout: parsed.layout,
    widgets: parsed.widgets,
    createdAt: new Date(parsed.createdAt),
    updatedAt: new Date(parsed.updatedAt)
  } satisfies DashboardConfig
}

const toDate = (value: Date | string | undefined, fallback: Date): Date => {
  if (!value) return fallback
  return value instanceof Date ? value : new Date(value)
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Initialize the storage system. The SQLite database is initialized in the
 * main bootstrap; this is kept for API compatibility with previous callers.
 */
export const initDashboardStorage = async (): Promise<void> => {
  // No-op: SQLite is initialized via initDatabase() before this is called.
}

/**
 * Load all dashboards for a specific connection.
 */
export const loadDashboards = async (connectionId: string): Promise<DashboardConfig[]> => {
  const rows = getDb()
    .select()
    .from(dashboards)
    .where(eq(dashboards.connectionId, connectionId))
    .all()

  const result: DashboardConfig[] = []
  for (const row of rows) {
    try {
      result.push(rowToDashboard(row))
    } catch (error) {
      console.error(`Failed to deserialize dashboard ${row.dashboardId}:`, error)
    }
  }

  return result.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Load a single dashboard by ID.
 */
export const getDashboard = async (
  connectionId: string,
  dashboardId: string
): Promise<DashboardConfig | undefined> => {
  const row = getDb()
    .select()
    .from(dashboards)
    .where(and(eq(dashboards.dashboardId, dashboardId), eq(dashboards.connectionId, connectionId)))
    .get()

  if (!row) return undefined

  try {
    return rowToDashboard(row)
  } catch (error) {
    console.error(`Failed to deserialize dashboard ${dashboardId}:`, error)
    return undefined
  }
}

/**
 * Save a dashboard (create or update).
 */
export const saveDashboard = async (dashboard: DashboardConfig): Promise<DashboardConfig> => {
  const now = new Date()
  const existing = getDb()
    .select({ createdAt: dashboards.createdAt })
    .from(dashboards)
    .where(eq(dashboards.dashboardId, dashboard.dashboardId))
    .get()

  const createdAt = existing ? new Date(existing.createdAt) : toDate(dashboard.createdAt, now)

  const updatedDashboard: DashboardConfig = {
    ...dashboard,
    createdAt,
    updatedAt: now
  }

  getDb()
    .insert(dashboards)
    .values({
      dashboardId: updatedDashboard.dashboardId,
      connectionId: updatedDashboard.connectionId,
      name: updatedDashboard.name,
      description: updatedDashboard.description ?? null,
      layoutJson: JSON.stringify(updatedDashboard.layout),
      widgetsJson: JSON.stringify(updatedDashboard.widgets),
      createdAt: createdAt.getTime(),
      updatedAt: now.getTime()
    })
    .onConflictDoUpdate({
      target: dashboards.dashboardId,
      set: {
        connectionId: updatedDashboard.connectionId,
        name: updatedDashboard.name,
        description: updatedDashboard.description ?? null,
        layoutJson: JSON.stringify(updatedDashboard.layout),
        widgetsJson: JSON.stringify(updatedDashboard.widgets),
        updatedAt: now.getTime()
      }
    })
    .run()

  return updatedDashboard
}

/**
 * Delete a dashboard.
 */
export const deleteDashboard = async (
  connectionId: string,
  dashboardId: string
): Promise<boolean> => {
  const result = getDb()
    .delete(dashboards)
    .where(and(eq(dashboards.dashboardId, dashboardId), eq(dashboards.connectionId, connectionId)))
    .run()

  return result.changes > 0
}

/**
 * Delete all dashboards for a connection.
 */
export const deleteAllDashboardsForConnection = async (connectionId: string): Promise<void> => {
  getDb().delete(dashboards).where(eq(dashboards.connectionId, connectionId)).run()
}

/**
 * No-op: SQLite writes are immediate. Kept for API compatibility.
 */
export const persistDashboard = async (_dashboardId: string): Promise<void> => {
  // No-op
}

/**
 * No-op: SQLite writes are immediate. Kept for API compatibility.
 */
export const persistAllDashboards = async (): Promise<void> => {
  // No-op
}

/**
 * Always false: writes are persisted synchronously to SQLite.
 */
export const hasUnsavedChanges = (): boolean => false

/**
 * Get all dashboards (for export/backup purposes).
 */
export const getAllDashboards = async (): Promise<DashboardConfig[]> => {
  const rows = getDb().select().from(dashboards).all()
  const result: DashboardConfig[] = []
  for (const row of rows) {
    try {
      result.push(rowToDashboard(row))
    } catch (error) {
      console.error(`Failed to deserialize dashboard ${row.dashboardId}:`, error)
    }
  }
  return result
}

/**
 * Import dashboards from external source.
 */
export const importDashboards = async (
  imports: DashboardConfig[],
  overwrite: boolean = false
): Promise<{ imported: number; skipped: number }> => {
  let imported = 0
  let skipped = 0
  const now = new Date()

  for (const dashboard of imports) {
    const existing = getDb()
      .select({ id: dashboards.dashboardId })
      .from(dashboards)
      .where(eq(dashboards.dashboardId, dashboard.dashboardId))
      .get()

    if (existing && !overwrite) {
      skipped++
      continue
    }

    const createdAt = toDate(dashboard.createdAt, now)

    getDb()
      .insert(dashboards)
      .values({
        dashboardId: dashboard.dashboardId,
        connectionId: dashboard.connectionId,
        name: dashboard.name,
        description: dashboard.description ?? null,
        layoutJson: JSON.stringify(dashboard.layout),
        widgetsJson: JSON.stringify(dashboard.widgets),
        createdAt: createdAt.getTime(),
        updatedAt: now.getTime()
      })
      .onConflictDoUpdate({
        target: dashboards.dashboardId,
        set: {
          connectionId: dashboard.connectionId,
          name: dashboard.name,
          description: dashboard.description ?? null,
          layoutJson: JSON.stringify(dashboard.layout),
          widgetsJson: JSON.stringify(dashboard.widgets),
          updatedAt: now.getTime()
        }
      })
      .run()

    imported++
  }

  return { imported, skipped }
}

/**
 * Export dashboards (optionally filtered by connection).
 */
export const exportDashboards = async (
  connectionId?: string
): Promise<{
  version: string
  exportedAt: string
  dashboards: DashboardConfig[]
}> => {
  const all = await getAllDashboards()
  const filtered = connectionId ? all.filter((d) => d.connectionId === connectionId) : all

  return {
    version: STORAGE_VERSION,
    exportedAt: new Date().toISOString(),
    dashboards: filtered
  }
}
