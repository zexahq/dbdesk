import { getDb } from './client'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { resolve } from 'node:path'

export function runMigrations(): void {
  const db = getDb()
  const migrationsFolder = resolve(__dirname, '../../drizzle')
  migrate(db, { migrationsFolder })
}
