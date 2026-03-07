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
    betterAuthClient.setupMain({
      bridges: true,
      csp: true,
      getWindow,
      scheme: true,
    })
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
      return unwrapData<SessionResponse>(session)
    } catch {
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
