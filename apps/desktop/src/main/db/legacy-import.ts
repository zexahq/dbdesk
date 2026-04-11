import { app } from 'electron'
import { readFileSync, renameSync } from 'node:fs'
import { join } from 'node:path'
import { getSqlite } from '@dbdesk/db'

const LEGACY_FLAG = 'legacy_json_import_v1'

function readJsonFile<T>(filename: string): T | null {
  const filePath = join(app.getPath('userData'), filename)
  try {
    const content = readFileSync(filePath, 'utf8').trim()
    if (!content) return null
    return JSON.parse(content) as T
  } catch {
    return null
  }
}

function backupFile(filename: string): void {
  const filePath = join(app.getPath('userData'), filename)
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

export function runLegacyImportIfNeeded(): void {
  const sqlite = getSqlite()

  const existing = sqlite
    .prepare('SELECT value FROM app_meta WHERE key = ?')
    .get(LEGACY_FLAG) as { value: string } | undefined

  if (existing) return

  console.log('[db] Running legacy JSON import...')

  const transaction = sqlite.transaction(() => {
    // Import connection profiles
    const profiles = readJsonFile<LegacyProfile[]>('connections.json')
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
            p.lastConnectedAt ? new Date(p.lastConnectedAt).getTime() : null,
          )
        } catch (err) {
          console.warn(`[db] Failed to import profile ${p.id}:`, err)
        }
      }
      console.log(`[db] Imported ${profiles.length} connection profiles`)
    }

    // Import workspaces
    const workspaces = readJsonFile<Record<string, LegacyWorkspace>>('workspaces.json')
    if (workspaces && typeof workspaces === 'object') {
      const stmt = sqlite.prepare(`
        INSERT OR REPLACE INTO workspaces (connection_id, tabs_json, active_tab_id, last_updated)
        VALUES (?, ?, ?, ?)
      `)
      let count = 0
      for (const [connectionId, ws] of Object.entries(workspaces)) {
        try {
          stmt.run(
            connectionId,
            JSON.stringify(ws.tabs || []),
            ws.activeTabId ?? null,
            new Date(ws.lastUpdated).getTime(),
          )
          count++
        } catch (err) {
          console.warn(`[db] Failed to import workspace ${connectionId}:`, err)
        }
      }
      console.log(`[db] Imported ${count} workspaces`)
    }

    // Import saved queries
    const savedQueries = readJsonFile<
      Record<string, Array<{ id: string; name: string; content: string; createdAt: string; updatedAt: string }>>
    >('saved-queries.json')
    if (savedQueries && typeof savedQueries === 'object') {
      const stmt = sqlite.prepare(`
        INSERT OR REPLACE INTO saved_queries (connection_id, id, name, content, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      let count = 0
      for (const [connectionId, queries] of Object.entries(savedQueries)) {
        for (const q of queries) {
          try {
            stmt.run(
              connectionId,
              q.id,
              q.name,
              q.content,
              new Date(q.createdAt).getTime(),
              new Date(q.updatedAt).getTime(),
            )
            count++
          } catch (err) {
            console.warn(`[db] Failed to import query ${q.id}:`, err)
          }
        }
      }
      console.log(`[db] Imported ${count} saved queries`)
    }

    // Import auth storage
    const authData = readJsonFile<Record<string, string>>('better-auth-storage.json')
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
    }

    // Mark import as complete
    sqlite.prepare('INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)').run(LEGACY_FLAG, 'done')
  })

  transaction()

  // Backup old files
  backupFile('connections.json')
  backupFile('workspaces.json')
  backupFile('saved-queries.json')
  backupFile('better-auth-storage.json')

  console.log('[db] Legacy import complete')
}
