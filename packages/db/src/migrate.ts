import { getSqlite } from './client'

export function runMigrations(): void {
  getSqlite().exec(`
    CREATE TABLE IF NOT EXISTS connection_profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      options_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_connected_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS workspaces (
      connection_id TEXT PRIMARY KEY REFERENCES connection_profiles(id) ON DELETE CASCADE,
      tabs_json TEXT NOT NULL,
      active_tab_id TEXT,
      last_updated INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS saved_queries (
      connection_id TEXT NOT NULL REFERENCES connection_profiles(id) ON DELETE CASCADE,
      id TEXT NOT NULL,
      name TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (connection_id, id)
    );

    CREATE TABLE IF NOT EXISTS auth_kv (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)
}
