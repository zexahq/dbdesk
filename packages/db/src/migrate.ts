import { getDb } from './client'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { resolve } from 'node:path'

export function runMigrations(migrationsFolder?: string): void {
  const db = getDb()
  const folder = migrationsFolder ?? resolve(__dirname, '../../drizzle')
  migrate(db, { migrationsFolder: folder })
}
