import { app } from 'electron'
import { readFileSync, renameSync } from 'node:fs'
import { join } from 'node:path'
import { getSqlite } from '@dbdesk/db'

// TODO: Remove this file once live migrations are implemented.
// This handles importing legacy JSON storage from pre-Drizzle versions.
// Can be safely deleted after all users have migrated to the SQLite version.

const LEGACY_FLAG = 'legacy_json_import_v1'

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

  // Read legacy files from the previous userData directory (before the path
  // override) so existing users' JSON data is found even if the path changed.
  const basePath = legacyDataPath ?? app.getPath('userData')

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
