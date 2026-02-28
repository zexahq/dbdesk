import { net } from 'electron'
import { tokenStore } from './token-store'
import { generatePKCE } from './pkce'

// ── Environment (injected at build time by electron-vite `define`) ──

declare const __API_URL__: string
declare const __WEB_URL__: string

const API_URL = __API_URL__
const WEB_URL = __WEB_URL__

// ── Types ──

interface ExchangeResponse {
  token: string
  user: { id: string; name: string; email: string; image: string | null } | null
}

interface SessionResponse {
  session: { id: string; expiresAt: string; token: string; userId: string }
  user: { id: string; name: string; email: string; image: string | null }
}

// ── PKCE state ──
// Volatile — only needs to live between login URL generation and deep-link callback.
let pendingVerifier: string | null = null

// ── Refresh deduplication ──
let sessionPromise: Promise<SessionResponse | null> | null = null

/**
 * Central auth manager for the main process.
 *
 * Responsibilities:
 *  - Generate login URLs with PKCE challenge
 *  - Exchange auth codes for bearer tokens
 *  - Retrieve + validate sessions from the server
 *  - Persist tokens in safeStorage
 */
export const authManager = {
  // ────────────────────────────────────────────────────────────────
  // Login URL
  // ────────────────────────────────────────────────────────────────

  /**
   * Build the web login URL with a PKCE code_challenge query param.
   * The code_verifier is kept in memory until the deep-link callback.
   */
  getLoginUrl(): string {
    const { codeVerifier, codeChallenge } = generatePKCE()
    pendingVerifier = codeVerifier
    return `${WEB_URL}/auth/desktop?code_challenge=${encodeURIComponent(codeChallenge)}`
  },

  /**
   * Return (and consume) the in-memory PKCE code_verifier.
   * Returns null if no login flow is in progress.
   */
  consumeVerifier(): string | null {
    const v = pendingVerifier
    pendingVerifier = null
    return v
  },

  // ────────────────────────────────────────────────────────────────
  // Token exchange
  // ────────────────────────────────────────────────────────────────

  /**
   * Exchange a one-time auth code + the PKCE code_verifier for a bearer
   * token. On success the token is persisted in safeStorage.
   */
  async exchangeCode(code: string, codeVerifier: string): Promise<ExchangeResponse> {
    const res = await net.fetch(`${API_URL}/api/auth/desktop/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, codeVerifier }),
    })

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(body.error || `Exchange failed (${res.status})`)
    }

    const data = (await res.json()) as ExchangeResponse
    await tokenStore.setTokens(data.token)
    return data
  },

  // ────────────────────────────────────────────────────────────────
  // Session
  // ────────────────────────────────────────────────────────────────

  /**
   * Fetch the current session from the server using the stored bearer
   * token. Returns null when unauthenticated or the session is expired.
   *
   * Concurrent calls are deduplicated so only one network request fires.
   */
  async getSession(): Promise<SessionResponse | null> {
    if (sessionPromise) return sessionPromise

    sessionPromise = this._fetchSession().finally(() => {
      sessionPromise = null
    })

    return sessionPromise
  },

  /** @internal */
  async _fetchSession(): Promise<SessionResponse | null> {
    const token = await tokenStore.getAccessToken()
    if (!token) return null

    try {
      const res = await net.fetch(`${API_URL}/api/session`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        // 401 → token invalid / expired
        if (res.status === 401) {
          await tokenStore.clear()
        }
        return null
      }

      return (await res.json()) as SessionResponse
    } catch {
      return null
    }
  },

  // ────────────────────────────────────────────────────────────────
  // Token access (for IPC)
  // ────────────────────────────────────────────────────────────────

  /**
   * Return the stored bearer token or null.
   * Used by renderer when it needs to attach the token to its own
   * requests (e.g. Hono RPC client).
   */
  async getToken(): Promise<string | null> {
    return tokenStore.getAccessToken()
  },

  // ────────────────────────────────────────────────────────────────
  // Logout
  // ────────────────────────────────────────────────────────────────

  /**
   * Server-side sign-out + clear local token store.
   */
  async logout(): Promise<void> {
    const token = await tokenStore.getAccessToken()

    // Best-effort server invalidation
    if (token) {
      try {
        await net.fetch(`${API_URL}/api/auth/sign-out`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
      } catch {
        // Swallow — we still clear local state
      }
    }

    await tokenStore.clear()
  },
}
