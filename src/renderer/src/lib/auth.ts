import { bearer } from 'better-auth/plugins'
import { createAuthClient } from 'better-auth/react'
import { useAuthStore } from '@renderer/store/auth-store'

const BEARER_TOKEN_KEY = 'dbdesk_bearer_token'
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:9876'

/**
 * Store bearer token in localStorage
 */
export const bearerToken = {
  get: () => localStorage.getItem(BEARER_TOKEN_KEY),
  set: (token: string) => localStorage.setItem(BEARER_TOKEN_KEY, token),
  remove: () => localStorage.removeItem(BEARER_TOKEN_KEY)
}

/**
 * Create auth client with better-auth
 */
export const authClient = createAuthClient({
  baseURL: API_URL,
  basePath: '/api/auth',
  plugins: [bearer()],
  fetchOptions: {
    auth: {
      type: 'Bearer',
      token: () => bearerToken.get() ?? undefined
    },
    headers: {
      'x-desktop': 'true'
    },
    async onError({ error }) {
      if (error.status === 401) {
        fullSignOut()
      }
    }
  }
})

/**
 * Sign out and clear all auth data
 */
export async function fullSignOut() {
  const store = useAuthStore.getState()
  await authClient.signOut()
  bearerToken.remove()
  store.logout()
}
