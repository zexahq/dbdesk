import { app } from 'electron'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'

const AUTH_STORAGE_FILE = 'better-auth-storage.json'

/**
 * Synchronous key-value storage for the @better-auth/electron client plugin.
 *
 * The plugin's internal `storageAdapter` calls `getItem` / `setItem`
 * **synchronously** and applies its own safeStorage encryption on top,
 * so this layer must be sync and must NOT add extra encryption.
 */

function getStoragePath(): string {
  return join(app.getPath('userData'), AUTH_STORAGE_FILE)
}

function readStore(): Record<string, string> {
  try {
    return JSON.parse(readFileSync(getStoragePath(), 'utf8')) as Record<string, string>
  } catch {
    return {}
  }
}

function writeStore(data: Record<string, string>): void {
  const filePath = getStoragePath()
  try {
    mkdirSync(dirname(filePath), { recursive: true })
  } catch {
    // already exists
  }
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
}

export const authStorage = {
  getItem(key: string): string | null {
    const store = readStore()
    return store[key] ?? null
  },

  setItem(key: string, value: unknown): void {
    const store = readStore()
    store[key] = value as string
    writeStore(store)
  },
}
