import type { BrowserWindow } from 'electron'
import { safeStorage } from 'electron'
import { betterAuthClient } from './better-auth-client'
import { getCachedSession, setCachedSession, clearCachedSession } from './session-cache'

interface SessionResponse {
  session: { id: string; expiresAt: string; token: string; userId: string }
  user: { id: string; name: string; email: string; image: string | null }
}

/**
 * Re-verify the cached session against the server at most once per day.
 * This keeps startup free of keychain touches (safeStorage decrypts) in the
 * common case, while still catching server-side revocation/expiry.
 */
const VERIFY_AFTER_MS = 24 * 60 * 60 * 1000

/**
 * True when OS-level encryption is unusable (e.g. Linux without a keyring).
 * Never throws; safe to call any time after app.ready().
 */
function isEncryptionUsable(): boolean {
  try {
    return safeStorage.isEncryptionAvailable()
  } catch {
    return false
  }
}

let _getWindow: (() => BrowserWindow | null) | null = null

function unwrapData<T>(value: unknown): T | null {
  if (!value || typeof value !== 'object') return null

  if ('data' in value) {
    return ((value as { data?: T | null }).data ?? null) as T | null
  }

  return value as T
}

/**
 * Notify the renderer that the session was invalidated
 * (server returned null / session expired).
 */
function notifySessionInvalidated(): void {
  const win = _getWindow?.()
  if (win && !win.isDestroyed()) {
    win.webContents.send('auth:session-invalidated')
  }
}

/**
 * Notify the renderer that the session was verified and refreshed.
 */
function notifySessionRefreshed(session: SessionResponse): void {
  const win = _getWindow?.()
  if (win && !win.isDestroyed()) {
    win.webContents.send('auth:session-refreshed', session)
  }
}

export const authManager = {
  setup(getWindow?: () => BrowserWindow | null) {
    _getWindow = getWindow ?? null
    console.log('[auth-manager] setup called')
    try {
      betterAuthClient.setupMain({
        bridges: true,
        csp: true,
        getWindow,
        scheme: true
      })
      console.log('[auth-manager] setupMain completed successfully')
    } catch (err) {
      console.error('[auth-manager] setupMain failed:', err)
    }
  },

  async requestAuth(): Promise<void> {
    await betterAuthClient.requestAuth()
  },

  /**
   * Fast session fetch — returns cached session from local SQLite immediately.
   * Only triggers a background server verification when the cache is older
   * than VERIFY_AFTER_MS, so everyday launches never touch the OS keychain.
   * Use this for startup — the user sees the UI instantly.
   */
  getSession(): SessionResponse | null {
    const cached = getCachedSession()
    if (cached) {
      if (isEncryptionUsable() && Date.now() - cached.cachedAt > VERIFY_AFTER_MS) {
        // Stale cache: re-verify in the background (may touch keychain once).
        void this.verifySessionInBackground()
      }
      return {
        session: {
          id: cached.id,
          expiresAt: new Date(cached.sessionExpiresAt).toISOString(),
          token: cached.sessionToken,
          userId: cached.userId
        },
        user: {
          id: cached.userId,
          name: cached.userName,
          email: cached.userEmail,
          image: cached.userImage
        }
      }
    }
    return null
  },

  /**
   * Force a fresh session fetch from the server.
   * Updates the local cache if successful, clears it if not.
   * Returns the session or null.
   */
  async getSessionFresh(): Promise<SessionResponse | null> {
    // Storage unusable (e.g. Linux without an OS keyring) is not the same as
    // logged out: serve the cache without clearing it, and skip a network
    // round-trip that could never authenticate anyway.
    if (!isEncryptionUsable()) {
      console.log('[auth-manager] getSessionFresh: encryption unavailable, serving cache')
      return this.getSession()
    }
    try {
      const session = await betterAuthClient.getSession()
      const result = unwrapData<SessionResponse>(session)
      if (result?.user) {
        // Update local cache
        setCachedSession({
          id: result.session.id,
          userId: result.user.id,
          userName: result.user.name,
          userEmail: result.user.email,
          userImage: result.user.image,
          sessionToken: result.session.token,
          sessionExpiresAt: new Date(result.session.expiresAt).getTime()
        })
        console.log('[auth-manager] getSessionFresh: success', result.user.email)
      } else {
        clearCachedSession()
        console.log('[auth-manager] getSessionFresh: null session')
      }
      return result
    } catch (err) {
      console.error('[auth-manager] getSessionFresh error:', err)
      // Don't clear cache on network error — the session might still be valid
      return null
    }
  },

  /**
   * Verify the session against the server in the background.
   * Updates/clears the local cache and notifies the renderer of any changes.
   */
  async verifySessionInBackground(): Promise<void> {
    const result = await this.getSessionFresh()
    if (result) {
      notifySessionRefreshed(result)
    } else {
      // Only clear + notify if we previously had a cached session
      // (avoid spurious events if user is already logged out)
      const hadCache = getCachedSession() !== null
      if (hadCache) {
        clearCachedSession()
        notifySessionInvalidated()
      }
    }
  },

  async getToken(): Promise<string | null> {
    // Try cache first
    const cached = getCachedSession()
    if (cached) {
      return cached.sessionToken
    }
    // Fallback to server
    const session = await this.getSessionFresh()
    return session?.session.token ?? null
  },

  async logout(): Promise<void> {
    try {
      await betterAuthClient.signOut()
    } finally {
      clearCachedSession()
    }
  }
}
