import type { BrowserWindow } from 'electron'
import { betterAuthClient } from './better-auth-client'
import { getCachedSession, setCachedSession, clearCachedSession } from './session-cache'

interface SessionResponse {
  session: { id: string; expiresAt: string; token: string; userId: string }
  user: { id: string; name: string; email: string; image: string | null }
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
        scheme: true,
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
   * Triggers a background server verification that updates the cache.
   * Use this for startup — the user sees the UI instantly.
   */
  getSession(): SessionResponse | null {
    const cached = getCachedSession()
    if (cached) {
      // Fire background verification
      void this.verifySessionInBackground()
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
  },
}
