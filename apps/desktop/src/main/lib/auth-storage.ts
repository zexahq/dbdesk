import { getSqlite } from '@dbdesk/db'

/**
 * Synchronous key-value storage for the @better-auth/electron client plugin.
 *
 * Uses the same SQLite database as the rest of the app.
 * The plugin's internal `storageAdapter` calls `getItem` / `setItem`
 * **synchronously** and applies its own safeStorage encryption on top,
 * so this layer must be sync and must NOT add extra encryption.
 */
export const authStorage = {
  getItem(key: string): string | null {
    const row = getSqlite()
      .prepare('SELECT value FROM auth_kv WHERE key = ?')
      .get(key) as { value: string } | undefined

    return row?.value ?? null
  },

  setItem(key: string, value: unknown): void {
    getSqlite()
      .prepare('INSERT OR REPLACE INTO auth_kv (key, value) VALUES (?, ?)')
      .run(key, value as string)
  },

  removeItem(key: string): void {
    getSqlite().prepare('DELETE FROM auth_kv WHERE key = ?').run(key)
  },
}
