import { getDb, getSqlite } from './client'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

export function supportedSchemaVersion(migrationsFolder: string): number {
  try {
    const raw = readFileSync(join(migrationsFolder, 'meta', '_journal.json'), 'utf-8')
    const journal = JSON.parse(raw) as { entries?: unknown[] }
    if (Array.isArray(journal.entries)) {
      return journal.entries.length
    }
  } catch {
    // fall through
  }
  return 0
}

export function currentSchemaVersion(): number {
  try {
    return getSqlite().pragma('user_version', { simple: true }) as number
  } catch {
    return 0
  }
}

export function runMigrations(migrationsFolder?: string): void {
  const folder =
    migrationsFolder ??
    (() => {
      const bundled = resolve(__dirname, '../../drizzle')
      if (existsSync(join(bundled, 'meta', '_journal.json'))) return bundled
      return resolve(__dirname, '../drizzle')
    })()
  const supported = supportedSchemaVersion(folder)
  const current = currentSchemaVersion()
  if (supported > 0 && current > supported) {
    throw new Error(
      `Database schema v${current} is newer than this app supports (v${supported}). Update DBDesk before opening it.`
    )
  }

  migrate(getDb(), { migrationsFolder: folder })
  if (supported > 0) {
    getSqlite().pragma(`user_version = ${supported}`)
  }
}
