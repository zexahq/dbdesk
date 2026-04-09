import { useAuthStore } from '@renderer/features/auth/stores/auth-store'

export async function requestSignIn(): Promise<void> {
  await window.requestAuth()
}

/**
 * Sign out: server-side invalidation + clear safeStorage + clear renderer store + navigate to auth.
 * Note: Returns a promise that resolves after logout, but navigation happens asynchronously.
 * The caller should handle navigation if needed.
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
