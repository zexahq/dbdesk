import {
  initDatabase,
  getDb,
  closeDatabase,
  connectionProfiles,
  dashboards,
  savedQueries,
  eq,
  and
} from '@dbdesk/db'
import { dashboardConfigSchema } from '@dbdesk/shared/schemas'
import type {
  ConnectionProfile,
  DashboardConfig,
  Widget,
  SavedQuery,
  SQLConnectionOptions
} from '@dbdesk/shared/types'
import { getDbPath } from './db-path'
import { ensureMigrated } from './migrate'
import { CliError } from './errors'

let initialized = false

export function ensureDb(): void {
  if (initialized) return
  const dbPath = getDbPath()
  initDatabase(dbPath)
  ensureMigrated()
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
  return resolveConnection(input).id
}

export function resolveConnection(input: string): ConnectionProfile {
  const conn = getConnection(input)
  if (!conn) {
    throw new CliError(
      'not-found',
      `Connection "${input}" not found.`,
      'Use "dbdesk connection list" to see available connections.'
    )
  }
  return conn
}

/**
 * Connection reference from `--connection`, falling back to
 * DBDESK_CONNECTION / DBDESK_CONNECTION so agents can set it once.
 */
export function connectionRefOrEnv(input: string | undefined): string {
  const ref = input ?? process.env.DBDESK_CONNECTION ?? process.env.DBDESK_CONNECTION
  if (!ref) {
    throw new CliError(
      'usage',
      'No connection specified.',
      'Pass --connection <name-or-id> or set DBDESK_CONNECTION.'
    )
  }
  return ref
}

export function addConnection(opts: {
  name: string
  host: string
  port?: number
  database: string
  user: string
  sslMode?: string
}): ConnectionProfile {
  ensureDb()
  const now = new Date()
  const id = crypto.randomUUID()

  // Passwordless by design: the CLI never accepts secrets. The password is
  // filled in later via the desktop app; until then the stored value is empty.
  const options: SQLConnectionOptions = {
    host: opts.host,
    port: opts.port ?? 5432,
    database: opts.database,
    user: opts.user,
    password: '',
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
  if (!conn) throw new CliError('not-found', `Connection "${idOrName}" not found.`)

  const result = getDb().delete(connectionProfiles).where(eq(connectionProfiles.id, conn.id)).run()

  return result.changes > 0
}

import { buildDashboardConfigJson } from '@dbdesk/shared/utils/dashboard-json'

// Dashboard operations. The CLI operates in the local (userId '') scope:
// it lists every dashboard on a connection regardless of owner, since it
// has no user identity. Rows the desktop app later claims keep working here
// because lookups are by dashboardId, not by owner.

function rowToDashboard(row: typeof dashboards.$inferSelect): DashboardConfig {
  // Prefer the full JSON document for content; columns stay authoritative
  // for identity/linking (dashboardId, connectionId, userId).
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
  const row = getDb().select().from(dashboards).where(eq(dashboards.dashboardId, dashboardId)).get()

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
    userId: '',
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
      userId: '',
      name,
      description: description ?? null,
      layoutJson: JSON.stringify(dashboard.layout),
      widgetsJson: JSON.stringify([]),
      configJson: buildDashboardConfigJson(dashboard, now, now),
      createdAt: now.getTime(),
      updatedAt: now.getTime()
    })
    .run()

  return dashboard
}

export function deleteDashboard(dashboardId: string): boolean {
  ensureDb()
  const result = getDb().delete(dashboards).where(eq(dashboards.dashboardId, dashboardId)).run()

  return result.changes > 0
}

export function saveDashboard(dashboard: DashboardConfig): DashboardConfig {
  ensureDb()
  const now = new Date()
  const updated = { ...dashboard, updatedAt: now }

  getDb()
    .update(dashboards)
    .set({
      name: updated.name,
      description: updated.description ?? null,
      layoutJson: JSON.stringify(updated.layout),
      widgetsJson: JSON.stringify(updated.widgets),
      configJson: buildDashboardConfigJson(updated, updated.createdAt, now),
      updatedAt: now.getTime()
    })
    .where(eq(dashboards.dashboardId, dashboard.dashboardId))
    .run()

  return updated
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

export function getSavedQuery(connectionId: string, idOrName: string): SavedQuery | undefined {
  ensureDb()
  const rows = getDb()
    .select()
    .from(savedQueries)
    .where(eq(savedQueries.connectionId, connectionId))
    .all()

  const row = rows.find((r: SavedQueryRow) => r.id === idOrName || r.name === idOrName)
  if (!row) return undefined
  return { id: row.id, name: row.name, content: row.content }
}

export function saveSavedQuery(connectionId: string, name: string, content: string): SavedQuery {
  ensureDb()
  const now = Date.now()
  const existing = getSavedQuery(connectionId, name)

  if (existing) {
    getDb()
      .update(savedQueries)
      .set({ content, updatedAt: now })
      .where(and(eq(savedQueries.connectionId, connectionId), eq(savedQueries.id, existing.id)))
      .run()
    return { id: existing.id, name, content }
  }

  const id = crypto.randomUUID()
  getDb()
    .insert(savedQueries)
    .values({ connectionId, id, name, content, createdAt: now, updatedAt: now })
    .run()
  return { id, name, content }
}

export function removeSavedQuery(connectionId: string, idOrName: string): boolean {
  ensureDb()
  const existing = getSavedQuery(connectionId, idOrName)
  if (!existing) return false
  const result = getDb()
    .delete(savedQueries)
    .where(and(eq(savedQueries.connectionId, connectionId), eq(savedQueries.id, existing.id)))
    .run()
  return result.changes > 0
}
