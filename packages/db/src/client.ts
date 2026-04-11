import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import * as schema from './schema'

export type DbClient = BetterSQLite3Database<typeof schema>

let sqlite: Database.Database | null = null
let _db: DbClient | null = null

/**
 * Initialize the local SQLite database at the given file path.
 * Must be called once before importing `db`.
 */
export function initDatabase(dbPath: string): void {
  if (_db) return

  mkdirSync(dirname(dbPath), { recursive: true })

  sqlite = new Database(dbPath)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  sqlite.pragma('busy_timeout = 5000')

  _db = drizzle(sqlite, { schema })
}

/**
 * The Drizzle database instance.
 * Throws if `initDatabase()` has not been called yet.
 */
export function getDb(): DbClient {
  if (!_db) throw new Error('Database not initialized. Call initDatabase() first.')
  return _db
}

/**
 * The raw better-sqlite3 connection (for sync operations like auth storage).
 * Throws if `initDatabase()` has not been called yet.
 */
export function getSqlite(): Database.Database {
  if (!sqlite) throw new Error('Database not initialized. Call initDatabase() first.')
  return sqlite
}

export function closeDatabase(): void {
  if (sqlite) {
    sqlite.close()
    sqlite = null
    _db = null
  }
}
