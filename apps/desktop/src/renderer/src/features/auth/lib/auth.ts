import { useAuthStore } from '@renderer/features/auth/stores/auth-store'

/**
 * Get the login URL (PKCE challenge is generated in the main process).
 */
export async function getLoginUrl(): Promise<string> {
  const { url } = await window.dbdesk.getLoginUrl()
  return url
}

/**
 * Sign out: server-side invalidation + clear safeStorage + clear renderer store.
 */
export async function fullSignOut(): Promise<void> {
  await window.dbdesk.logout()
  useAuthStore.getState().logout()
}

/**
 * Get the cached bearer token from the auth store (synchronous).
 * Used by the API client to attach the Authorization header.
 */
export function getCachedToken(): string | null {
  return useAuthStore.getState().token
}
