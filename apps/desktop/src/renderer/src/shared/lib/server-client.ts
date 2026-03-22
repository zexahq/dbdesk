/**
 * Typed Hono RPC client instance for the desktop renderer.
 *
 * This replaces the old manual `ApiClient` class in `lib/api-client.ts`.
 * All server calls are fully typed via Hono RPC.
 */
import { createApiClient } from '@dbdesk/api-client'
import { getCachedToken, fullSignOut } from '@renderer/features/auth/lib/auth'

/**
 * Pre-configured typed API client.
 *
 * Uses `window.env.API_URL` as the base URL and injects the bearer token
 * from the in-memory auth store on every request.
 *
 * @example
 * ```ts
 * const res = await serverClient.api.session.$get()
 * const data = await res.json()
 * ```
 */
export const serverClient = createApiClient(window.env.API_URL, {
  getToken: () => getCachedToken(),
})

/**
 * Helper to unwrap a fetch Response, handling 401 (session expiry) automatically.
 * Throws an error for non-ok responses.
 */
export async function unwrapServerResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    void fullSignOut()
    throw new Error('Session expired. Please login again.')
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(
      (error as { message?: string }).message || `Request failed: ${response.status}`,
    )
  }

  return response.json() as Promise<T>
}
