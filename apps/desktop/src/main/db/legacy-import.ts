import { app } from 'electron'
import { existsSync, readFileSync, renameSync } from 'node:fs'
import { join } from 'node:path'
import * as yaml from 'js-yaml'
import { getSqlite } from '@dbdesk/db'

// TODO: Remove this file once live migrations are implemented.
// This handles importing legacy JSON storage from pre-Drizzle versions.
// Can be safely deleted after all users have migrated to the SQLite version.

const LEGACY_FLAG = 'legacy_json_import_v1'
const DASHBOARD_YAML_FLAG = 'legacy_dashboard_yaml_import_v1'

function readJsonFile<T>(basePath: string, filename: string): T | null {
  const filePath = join(basePath, filename)
  try {
    const content = readFileSync(filePath, 'utf8').trim()
    if (!content) return null
    return JSON.parse(content) as T
  } catch {
    return null
  }
}

function backupFile(basePath: string, filename: string): void {
  const filePath = join(basePath, filename)
  try {
    renameSync(filePath, `${filePath}.bak`)
  } catch {
    // File may not exist
  }
}

const LEGACY_JSON_FILENAMES = [
  'connections.json',
  'workspaces.json',
  'saved-queries.json',
  'better-auth-storage.json'
] as const

function findLegacyJsonBasePath(basePaths: string[]): string {
  for (const basePath of basePaths) {
    if (LEGACY_JSON_FILENAMES.some((filename) => existsSync(join(basePath, filename)))) {
      return basePath
    }
  }

  return basePaths[0] ?? app.getPath('userData')
}

interface LegacyProfile {
  id: string
  name: string
  type: string
  options: unknown
  createdAt: string
  updatedAt: string
  lastConnectedAt?: string
}

interface LegacyWorkspace {
  connectionId: string
  tabs: unknown[]
  activeTabId: string | null
  lastUpdated: string
}

export function runLegacyImportIfNeeded(legacyDataPath?: string): void {
  const sqlite = getSqlite()

  const existing = sqlite.prepare('SELECT value FROM app_meta WHERE key = ?').get(LEGACY_FLAG) as
    | { value: string }
    | undefined

  if (existing) return

  const candidateBasePaths = Array.from(
    new Set([app.getPath('userData'), legacyDataPath].filter((value): value is string => !!value))
  )
  const basePath = findLegacyJsonBasePath(candidateBasePaths)

  console.log('[db] Running legacy JSON import...')

  let importedAny = false

  const transaction = sqlite.transaction(() => {
    const profiles = readJsonFile<LegacyProfile[]>(basePath, 'connections.json')
    if (profiles && Array.isArray(profiles)) {
      const stmt = sqlite.prepare(`
        INSERT OR REPLACE INTO connection_profiles (id, name, type, options_json, created_at, updated_at, last_connected_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      for (const p of profiles) {
        try {
          stmt.run(
            p.id,
            p.name,
            p.type,
            JSON.stringify(p.options),
            new Date(p.createdAt).getTime(),
            new Date(p.updatedAt).getTime(),
            p.lastConnectedAt ? new Date(p.lastConnectedAt).getTime() : null
          )
        } catch (err) {
          console.warn(`[db] Failed to import profile ${p.id}:`, err)
        }
      }
      console.log(`[db] Imported ${profiles.length} connection profiles`)
      importedAny = true
    }

    const legacyWorkspaces = readJsonFile<Record<string, LegacyWorkspace>>(basePath, 'workspaces.json')
    if (legacyWorkspaces && typeof legacyWorkspaces === 'object') {
      const stmt = sqlite.prepare(`
        UPDATE connection_profiles SET tabs_json = ?, active_tab_id = ?, last_updated = ? WHERE id = ?
      `)
      let count = 0
      for (const [connectionId, ws] of Object.entries(legacyWorkspaces)) {
        try {
          stmt.run(
            JSON.stringify(ws.tabs || []),
            ws.activeTabId ?? null,
            new Date(ws.lastUpdated).getTime(),
            connectionId
          )
          count++
        } catch (err) {
          console.warn(`[db] Failed to import workspace ${connectionId}:`, err)
        }
      }
      console.log(`[db] Merged ${count} workspaces into connection_profiles`)
      if (count > 0) importedAny = true
    }

    const savedQueriesData =
      readJsonFile<
        Record<
          string,
          Array<{ id: string; name: string; content: string; createdAt: string; updatedAt: string }>
        >
      >(basePath, 'saved-queries.json')
    if (savedQueriesData && typeof savedQueriesData === 'object') {
      const stmt = sqlite.prepare(`
        INSERT OR REPLACE INTO saved_queries (connection_id, id, name, content, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      let count = 0
      for (const [connectionId, queries] of Object.entries(savedQueriesData)) {
        for (const q of queries) {
          try {
            stmt.run(
              connectionId,
              q.id,
              q.name,
              q.content,
              new Date(q.createdAt).getTime(),
              new Date(q.updatedAt).getTime()
            )
            count++
          } catch (err) {
            console.warn(`[db] Failed to import query ${q.id}:`, err)
          }
        }
      }
      console.log(`[db] Imported ${count} saved queries`)
      if (count > 0) importedAny = true
    }

    const authData = readJsonFile<Record<string, string>>(basePath, 'better-auth-storage.json')
    if (authData && typeof authData === 'object') {
      const stmt = sqlite.prepare(`
        INSERT OR REPLACE INTO auth_kv (key, value) VALUES (?, ?)
      `)
      let count = 0
      for (const [key, value] of Object.entries(authData)) {
        try {
          stmt.run(key, value)
          count++
        } catch (err) {
          console.warn(`[db] Failed to import auth key ${key}:`, err)
        }
      }
      console.log(`[db] Imported ${count} auth entries`)
      if (count > 0) importedAny = true
    }

    sqlite
      .prepare('INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)')
      .run(LEGACY_FLAG, 'done')
  })

  transaction()

  if (importedAny) {
    backupFile(basePath, 'connections.json')
    backupFile(basePath, 'workspaces.json')
    backupFile(basePath, 'saved-queries.json')
    backupFile(basePath, 'better-auth-storage.json')
  }

  console.log('[db] Legacy import complete')
}

interface LegacyDashboardWidget {
  id: string
  type: string
  title: string
  queryId: string | null
  customQuery?: string
  position: unknown
  settings: unknown
}

interface LegacyDashboard {
  dashboardId: string
  connectionId: string
  name: string
  description?: string
  layout: unknown
  widgets: LegacyDashboardWidget[]
  createdAt: string
  updatedAt: string
}

interface LegacyDashboardsYaml {
  version?: string
  lastModified?: string
  dashboards: LegacyDashboard[]
}

interface DashboardYamlSource {
  basePath: string
  parsed: LegacyDashboardsYaml
}

function readYamlFile<T>(basePath: string, filename: string): T | null {
  const filePath = join(basePath, filename)
  try {
    const content = readFileSync(filePath, 'utf8').trim()
    if (!content) return null
    // JSON_SCHEMA disallows custom tags that could execute arbitrary code.
    return yaml.load(content, { schema: yaml.JSON_SCHEMA }) as T
  } catch {
    return null
  }
}

function findDashboardYamlSource(basePaths: string[]): DashboardYamlSource | null {
  for (const basePath of basePaths) {
    const parsed =
      readYamlFile<LegacyDashboardsYaml>(basePath, 'dashboards.yaml') ??
      readYamlFile<LegacyDashboardsYaml>(basePath, 'dashboards.yaml.backup')

    if (parsed && Array.isArray(parsed.dashboards)) {
      return { basePath, parsed }
    }
  }

  return null
}

/**
 * Migrate dashboards from the legacy `dashboards.yaml` file (and its `.backup`)
 * into the SQLite `dashboards` table. Idempotent via the `app_meta` flag.
 */
export function runDashboardYamlImportIfNeeded(legacyDataPath?: string): void {
  const sqlite = getSqlite()

  const existingFlag = sqlite
    .prepare('SELECT value FROM app_meta WHERE key = ?')
    .get(DASHBOARD_YAML_FLAG) as { value: string } | undefined

  const candidateBasePaths = Array.from(
    new Set([app.getPath('userData'), legacyDataPath].filter((value): value is string => !!value))
  )
  const source = findDashboardYamlSource(candidateBasePaths)

  if (existingFlag) {
    const existingDashboards = sqlite
      .prepare('SELECT COUNT(*) as count FROM dashboards')
      .get() as { count: number }

    if (existingDashboards.count > 0 || !source) {
      return
    }
  }

  console.log('[db] Running legacy dashboard YAML import...')

  let imported = 0

  const transaction = sqlite.transaction(() => {
    if (source) {
      const stmt = sqlite.prepare(`
        INSERT OR REPLACE INTO dashboards
          (dashboard_id, connection_id, name, description, layout_json, widgets_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)

      // Verify the connection exists before inserting; the FK is ON DELETE CASCADE
      // and an INSERT with a missing parent would be rejected.
      const connExists = sqlite.prepare('SELECT 1 FROM connection_profiles WHERE id = ?')

      for (const d of source.parsed.dashboards) {
        try {
          if (!connExists.get(d.connectionId)) {
            console.warn(
              `[db] Skipping dashboard ${d.dashboardId}: connection ${d.connectionId} not found`
            )
            continue
          }
          stmt.run(
            d.dashboardId,
            d.connectionId,
            d.name,
            d.description ?? null,
            JSON.stringify(d.layout ?? {}),
            JSON.stringify(d.widgets ?? []),
            new Date(d.createdAt).getTime(),
            new Date(d.updatedAt).getTime()
          )
          imported++
        } catch (err) {
          console.warn(`[db] Failed to import dashboard ${d.dashboardId}:`, err)
        }
      }
      console.log(`[db] Imported ${imported} dashboards from YAML`)
    }

    sqlite
      .prepare('INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)')
      .run(DASHBOARD_YAML_FLAG, 'done')
  })

  transaction()

  if (source && imported > 0) {
    backupFile(source.basePath, 'dashboards.yaml')
    backupFile(source.basePath, 'dashboards.yaml.backup')
  }

  console.log('[db] Dashboard YAML import complete')
}
