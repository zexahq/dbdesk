import { hc } from 'hono/client'
import type { AppType } from '@dbdesk/server'

export interface CreateApiClientOptions {
  /** Return the current bearer token, or null if not authenticated */
  getToken?: () => string | null
  /** Custom headers to include on every request */
  headers?: Record<string, string>
}

/**
 * Create a fully typed Hono RPC client for the DBDesk server.
 *
 * @example
 * ```ts
 * const api = createApiClient('http://localhost:3000', {
 *   getToken: () => localStorage.getItem('token'),
 * })
 * const res = await api.api.session.$get()
 * const data = await res.json()
 * ```
 */
export function createApiClient(baseUrl: string, options: CreateApiClientOptions = {}) {
  return hc<AppType>(baseUrl, {
    headers() {
      const h: Record<string, string> = {
        'x-desktop': 'true',
        ...options.headers,
      }

      const token = options.getToken?.()
      if (token) {
        h['Authorization'] = `Bearer ${token}`
      }

      return h
    },
  })
}

export type ApiClient = ReturnType<typeof createApiClient>
