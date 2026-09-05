export { initDatabase, getDb, getSqlite, closeDatabase } from './client'
export type { DbClient } from './client'
export { runMigrations, supportedSchemaVersion, currentSchemaVersion } from './migrate'
export * from './schema'

export { eq, and } from 'drizzle-orm'
