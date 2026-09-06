/**
 * Dashboard Storage Module
 *
 * SQLite-backed persistence for dashboard configurations using Drizzle ORM.
 * Layout and widgets are stored as JSON columns in the `dashboards` table.
 */

import { and, eq, isNull, getDb, dashboards } from '@dbdesk/db'
import { dashboardConfigSchema } from '@dbdesk/shared/schemas'
import type { DashboardConfig } from '@common/types'

const STORAGE_VERSION = '1.0.0'

type DashboardRow = typeof dashboards.$inferSelect

// The full JSON document persisted in the `config_json` column, kept in
// tandem with the decomposed columns.
const buildConfigJson = (dashboard: DashboardConfig, createdAt: Date, updatedAt: Date): string =>
  JSON.stringify({
    dashboardId: dashboard.dashboardId,
    connectionId: dashboard.connectionId,
    userId: dashboard.userId ?? undefined,
    name: dashboard.name,
    description: dashboard.description ?? undefined,
    layout: dashboard.layout,
    widgets: dashboard.widgets,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString()
  })

const rowToDashboard = (row: DashboardRow): DashboardConfig => {
  // Prefer the full JSON document for content; columns stay authoritative for
  // identity/linking (dashboardId, connectionId, userId).
  const fromJson = row.configJson ? (JSON.parse(row.configJson) as Partial<DashboardConfig>) : null

  const parsed = dashboardConfigSchema.parse({
    dashboardId: row.dashboardId,
    connectionId: row.connectionId,
    userId: row.userId ?? fromJson?.userId ?? undefined,
    name: fromJson?.name ?? row.name,
    description: fromJson?.description ?? row.description ?? undefined,
    layout: fromJson?.layout ?? JSON.parse(row.layoutJson),
    widgets: fromJson?.widgets ?? JSON.parse(row.widgetsJson),
    createdAt: fromJson?.createdAt ?? new Date(row.createdAt).toISOString(),
    updatedAt: fromJson?.updatedAt ?? new Date(row.updatedAt).toISOString()
  })

  return {
    dashboardId: parsed.dashboardId,
    connectionId: parsed.connectionId,
    userId: parsed.userId,
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
 * main bootstrap; this backfills `config_json` for rows persisted before the
 * column existed so the full JSON stays in tandem with the columns.
 */
export const initDashboardStorage = async (): Promise<void> => {
  const legacyRows = getDb().select().from(dashboards).where(isNull(dashboards.configJson)).all()

  for (const row of legacyRows) {
    try {
      const dashboard = rowToDashboard(row)
      getDb()
        .update(dashboards)
        .set({ configJson: buildConfigJson(dashboard, dashboard.createdAt, dashboard.updatedAt) })
        .where(eq(dashboards.dashboardId, row.dashboardId))
        .run()
    } catch (error) {
      console.error(`Failed to backfill config_json for dashboard ${row.dashboardId}:`, error)
    }
  }
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
  if (!dashboard.userId) {
    throw new Error('Cannot save a dashboard without an authenticated user')
  }
  const userId = dashboard.userId
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

  const configJson = buildConfigJson(updatedDashboard, createdAt, now)

  getDb()
    .insert(dashboards)
    .values({
      dashboardId: updatedDashboard.dashboardId,
      connectionId: updatedDashboard.connectionId,
      userId,
      name: updatedDashboard.name,
      description: updatedDashboard.description ?? null,
      layoutJson: JSON.stringify(updatedDashboard.layout),
      widgetsJson: JSON.stringify(updatedDashboard.widgets),
      configJson,
      createdAt: createdAt.getTime(),
      updatedAt: now.getTime()
    })
    .onConflictDoUpdate({
      target: dashboards.dashboardId,
      set: {
        connectionId: updatedDashboard.connectionId,
        userId,
        name: updatedDashboard.name,
        description: updatedDashboard.description ?? null,
        layoutJson: JSON.stringify(updatedDashboard.layout),
        widgetsJson: JSON.stringify(updatedDashboard.widgets),
        configJson,
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
    const userId = dashboard.userId
    if (!userId) {
      skipped++
      continue
    }
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
    const configJson = buildConfigJson(dashboard, createdAt, now)

    getDb()
      .insert(dashboards)
      .values({
        dashboardId: dashboard.dashboardId,
        connectionId: dashboard.connectionId,
        userId,
        name: dashboard.name,
        description: dashboard.description ?? null,
        layoutJson: JSON.stringify(dashboard.layout),
        widgetsJson: JSON.stringify(dashboard.widgets),
        configJson,
        createdAt: createdAt.getTime(),
        updatedAt: now.getTime()
      })
      .onConflictDoUpdate({
        target: dashboards.dashboardId,
        set: {
          connectionId: dashboard.connectionId,
          userId,
          name: dashboard.name,
          description: dashboard.description ?? null,
          layoutJson: JSON.stringify(dashboard.layout),
          widgetsJson: JSON.stringify(dashboard.widgets),
          configJson,
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
