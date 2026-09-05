import { initDatabase, getDb, closeDatabase, connectionProfiles, dashboards, savedQueries, eq, and } from '@dbdesk/db'
import { dashboardConfigSchema } from '@dbdesk/shared/schemas'
import type { ConnectionProfile, DashboardConfig, Widget, SavedQuery, SQLConnectionOptions } from '@dbdesk/shared/types'
import { getDbPath } from './db-path'

let initialized = false

export function ensureDb(): void {
  if (initialized) return
  const dbPath = getDbPath()
  initDatabase(dbPath)
  initialized = true
}

export function shutdownDb(): void {
  if (initialized) {
    closeDatabase()
    initialized = false
  }
}

function parseOptionsJson(raw: string | null) {
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function toProfile(row: typeof connectionProfiles.$inferSelect): ConnectionProfile {
  const options = parseOptionsJson(row.optionsJson)
  return {
    id: row.id,
    name: row.name,
    type: row.type as ConnectionProfile['type'],
    options,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    lastConnectedAt: row.lastConnectedAt ? new Date(row.lastConnectedAt) : undefined
  } as ConnectionProfile
}

export function listConnections(): ConnectionProfile[] {
  ensureDb()
  const rows = getDb().select().from(connectionProfiles).all()
  return rows.map(toProfile)
}

export function getConnection(idOrName: string): ConnectionProfile | undefined {
  ensureDb()
  let row = getDb()
    .select()
    .from(connectionProfiles)
    .where(eq(connectionProfiles.id, idOrName))
    .get()

  if (!row) {
    row = getDb()
      .select()
      .from(connectionProfiles)
      .where(eq(connectionProfiles.name, idOrName))
      .get()
  }

  return row ? toProfile(row) : undefined
}

export function resolveConnectionId(input: string): string {
  const conn = getConnection(input)
  if (!conn) {
    throw new Error(`Connection "${input}" not found. Use "dbdesk connection list" to see available connections.`)
  }
  return conn.id
}

export function resolveConnection(input: string): ConnectionProfile {
  const conn = getConnection(input)
  if (!conn) {
    throw new Error(`Connection "${input}" not found. Use "dbdesk connection list" to see available connections.`)
  }
  return conn
}

export function addConnection(opts: {
  name: string
  host: string
  port?: number
  database: string
  user: string
  password?: string
  sslMode?: string
}): ConnectionProfile {
  ensureDb()
  const now = new Date()
  const id = crypto.randomUUID()

  const options: SQLConnectionOptions = {
    host: opts.host,
    port: opts.port ?? 5432,
    database: opts.database,
    user: opts.user,
    password: opts.password ?? '',
    sslMode: (opts.sslMode as SQLConnectionOptions['sslMode']) ?? 'disable'
  }

  const profile: ConnectionProfile = {
    id,
    name: opts.name,
    type: 'postgres',
    options,
    createdAt: now,
    updatedAt: now
  } as ConnectionProfile

  getDb()
    .insert(connectionProfiles)
    .values({
      id: profile.id,
      name: profile.name,
      type: profile.type,
      optionsJson: JSON.stringify(options),
      createdAt: now.getTime(),
      updatedAt: now.getTime(),
      lastConnectedAt: null
    })
    .run()

  return profile
}

export function removeConnection(idOrName: string): boolean {
  ensureDb()
  const conn = getConnection(idOrName)
  if (!conn) throw new Error(`Connection "${idOrName}" not found.`)

  const result = getDb()
    .delete(connectionProfiles)
    .where(eq(connectionProfiles.id, conn.id))
    .run()

  return result.changes > 0
}

// Dashboard operations

function rowToDashboard(row: typeof dashboards.$inferSelect): DashboardConfig {
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
    widgets: parsed.widgets as Widget[],
    createdAt: new Date(parsed.createdAt),
    updatedAt: new Date(parsed.updatedAt)
  } satisfies DashboardConfig
}

export function listDashboards(connectionId: string): DashboardConfig[] {
  ensureDb()
  const rows = getDb()
    .select()
    .from(dashboards)
    .where(eq(dashboards.connectionId, connectionId))
    .all()

  return rows
    .map((r) => {
      try {
        return rowToDashboard(r)
      } catch {
        return null
      }
    })
    .filter((d): d is DashboardConfig => d !== null)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function getDashboard(dashboardId: string): DashboardConfig | undefined {
  ensureDb()
  const row = getDb()
    .select()
    .from(dashboards)
    .where(eq(dashboards.dashboardId, dashboardId))
    .get()

  if (!row) return undefined
  try {
    return rowToDashboard(row)
  } catch {
    return undefined
  }
}

export function createDashboard(
  connectionId: string,
  name: string,
  description?: string
): DashboardConfig {
  ensureDb()
  const now = new Date()
  const id = crypto.randomUUID()

  const dashboard: DashboardConfig = {
    dashboardId: id,
    connectionId,
    name,
    description,
    layout: { columns: 12, rowHeight: 48, margin: [8, 8] },
    widgets: [],
    createdAt: now,
    updatedAt: now
  }

  getDb()
    .insert(dashboards)
    .values({
      dashboardId: id,
      connectionId,
      name,
      description: description ?? null,
      layoutJson: JSON.stringify(dashboard.layout),
      widgetsJson: JSON.stringify([]),
      createdAt: now.getTime(),
      updatedAt: now.getTime()
    })
    .run()

  return dashboard
}

export function deleteDashboard(dashboardId: string): boolean {
  ensureDb()
  const result = getDb()
    .delete(dashboards)
    .where(eq(dashboards.dashboardId, dashboardId))
    .run()

  return result.changes > 0
}

export function saveDashboard(dashboard: DashboardConfig): DashboardConfig {
  ensureDb()
  const now = new Date()

  getDb()
    .update(dashboards)
    .set({
      name: dashboard.name,
      description: dashboard.description ?? null,
      layoutJson: JSON.stringify(dashboard.layout),
      widgetsJson: JSON.stringify(dashboard.widgets),
      updatedAt: now.getTime()
    })
    .where(eq(dashboards.dashboardId, dashboard.dashboardId))
    .run()

  return { ...dashboard, updatedAt: now }
}

export function updateDashboardWidgets(
  dashboardId: string,
  widgets: Widget[]
): DashboardConfig | undefined {
  ensureDb()
  const dashboard = getDashboard(dashboardId)
  if (!dashboard) return undefined

  const updated = { ...dashboard, widgets, updatedAt: new Date() }
  return saveDashboard(updated)
}

// Saved queries

type SavedQueryRow = typeof savedQueries.$inferSelect

export function listSavedQueries(connectionId: string): SavedQuery[] {
  ensureDb()
  const rows = getDb()
    .select()
    .from(savedQueries)
    .where(eq(savedQueries.connectionId, connectionId))
    .all()

  return rows.map((r: SavedQueryRow) => ({
    id: r.id,
    name: r.name,
    content: r.content
  }))
}
