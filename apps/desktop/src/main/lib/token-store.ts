import { safeStorage } from 'electron'
import { promises as fs } from 'node:fs'
import { join, dirname } from 'node:path'
import { app } from 'electron'

const AUTH_FILENAME = 'auth.json'

interface StoredAuth {
  values?: Record<string, string>
}

const getStoragePath = (): string => join(app.getPath('userData'), AUTH_FILENAME)

async function readStore(): Promise<StoredAuth> {
  try {
    const content = await fs.readFile(getStoragePath(), 'utf8')
    return JSON.parse(content) as StoredAuth
  } catch {
    return {}
  }
}

async function writeStore(data: StoredAuth): Promise<void> {
  const filePath = getStoragePath()
  await fs.mkdir(dirname(filePath), { recursive: true }).catch(() => {})
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8')
}

function encrypt(value: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(value).toString('base64')
  }
  // Fallback: store plain (dev mode or unsupported OS)
  return Buffer.from(value, 'utf8').toString('base64')
}

function decrypt(encoded: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.decryptString(Buffer.from(encoded, 'base64'))
  }
  return Buffer.from(encoded, 'base64').toString('utf8')
}

/**
 * Secure token storage backed by Electron safeStorage (OS keychain encryption)
 * and a JSON file in userData.
 *
 * Tokens are encrypted at rest via the OS credential manager (macOS Keychain,
 * Windows DPAPI, Linux libsecret). Falls back to base64 if unavailable.
 */
export const tokenStore = {
  async getItem(key: string): Promise<unknown | null> {
    const data = await readStore()
    const value = data.values?.[key]
    if (!value) return null
    try {
      return JSON.parse(decrypt(value)) as unknown
    } catch {
      return null
    }
  },

  async setItem(key: string, value: unknown): Promise<void> {
    const data = await readStore()
    const values = { ...(data.values ?? {}) }

    if (value === null) {
      delete values[key]
    } else {
      values[key] = encrypt(JSON.stringify(value))
    }

    await writeStore({ values })
  },

  async clear(): Promise<void> {
    await writeStore({ values: {} })
  },
}
