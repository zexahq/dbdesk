import type { BrowserWindow } from 'electron'
import { betterAuthClient } from './better-auth-client'

interface SessionResponse {
  session: { id: string; expiresAt: string; token: string; userId: string }
  user: { id: string; name: string; email: string; image: string | null }
}

let sessionPromise: Promise<SessionResponse | null> | null = null

function unwrapData<T>(value: unknown): T | null {
  if (!value || typeof value !== 'object') return null

  if ('data' in value) {
    return ((value as { data?: T | null }).data ?? null) as T | null
  }

  return value as T
}

export const authManager = {
  setup(getWindow?: () => BrowserWindow | null) {
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

  async getSession(): Promise<SessionResponse | null> {
    if (sessionPromise) return sessionPromise

    sessionPromise = this._fetchSession().finally(() => {
      sessionPromise = null
    })

    return sessionPromise
  },

  async _fetchSession(): Promise<SessionResponse | null> {
    try {
      const session = await betterAuthClient.getSession()
      const result = unwrapData<SessionResponse>(session)
      console.log('[auth-manager] _fetchSession result:', result ? `user=${result.user?.email}` : 'null')
      return result
    } catch (err) {
      console.error('[auth-manager] _fetchSession error:', err)
      return null
    }
  },

  async getToken(): Promise<string | null> {
    const session = await this.getSession()
    return session?.session.token ?? null
  },

  async logout(): Promise<void> {
    try {
      await betterAuthClient.signOut()
    } finally {
      sessionPromise = null
    }
  },
}
