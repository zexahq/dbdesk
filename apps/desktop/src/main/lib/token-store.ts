import { safeStorage } from 'electron'
import { promises as fs } from 'node:fs'
import { join, dirname } from 'node:path'
import { app } from 'electron'

const AUTH_FILENAME = 'auth.json'

interface StoredAuth {
  /** safeStorage-encrypted access token, base64-encoded */
  accessToken?: string
  /** safeStorage-encrypted refresh token, base64-encoded */
  refreshToken?: string
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
  async setTokens(accessToken: string, refreshToken?: string): Promise<void> {
    const data: StoredAuth = {
      accessToken: encrypt(accessToken),
    }
    if (refreshToken) {
      data.refreshToken = encrypt(refreshToken)
    }
    await writeStore(data)
  },

  async getAccessToken(): Promise<string | null> {
    const data = await readStore()
    if (!data.accessToken) return null
    try {
      return decrypt(data.accessToken)
    } catch {
      return null
    }
  },

  async getRefreshToken(): Promise<string | null> {
    const data = await readStore()
    if (!data.refreshToken) return null
    try {
      return decrypt(data.refreshToken)
    } catch {
      return null
    }
  },

  async clear(): Promise<void> {
    await writeStore({})
  },

  async hasToken(): Promise<boolean> {
    const data = await readStore()
    return !!data.accessToken
  },
}
