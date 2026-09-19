import { safeStorage } from 'electron'

const PREFIX = 'safe-storage:v1:'

export function isSecureStorageAvailable(): boolean {
  try {
    return safeStorage.isEncryptionAvailable()
  } catch {
    return false
  }
}

export function encryptForStorage(value: string): string | null {
  if (!isSecureStorageAvailable()) return null

  try {
    return `${PREFIX}${safeStorage.encryptString(value).toString('base64')}`
  } catch (error) {
    console.error('[secure-storage] Failed to encrypt value:', error)
    return null
  }
}

export function decryptFromStorage(value: string): string | null {
  if (!value.startsWith(PREFIX) || !isSecureStorageAvailable()) return null

  try {
    return safeStorage.decryptString(Buffer.from(value.slice(PREFIX.length), 'base64'))
  } catch (error) {
    console.error('[secure-storage] Failed to decrypt value:', error)
    return null
  }
}

export function isEncryptedValue(value: string): boolean {
  return value.startsWith(PREFIX)
}
