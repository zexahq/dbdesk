import { useAuthStore } from '@renderer/features/auth/stores/auth-store'

export async function requestSignIn(): Promise<void> {
  await window.requestAuth()
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
