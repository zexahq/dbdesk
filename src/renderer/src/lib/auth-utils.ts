import { authClient, bearerToken } from './auth'
import { useAuthStore } from '@renderer/store/auth-store'

const CHALLENGE_STORAGE_KEY = 'dbdesk_auth_challenge'

/**
 * Store and manage code challenge using preload secure crypto
 */
export const codeChallenge = {
  generate(): string {
    const { challenge, encrypted } = window.challenge.generate()
    localStorage.setItem(CHALLENGE_STORAGE_KEY, encrypted)
    // Return encrypted so we can pass it in URL
    return challenge
  },
  verify(challenge: string): boolean {
    const encrypted = localStorage.getItem(CHALLENGE_STORAGE_KEY)
    if (!encrypted) return false

    return window.challenge.verify(encrypted, challenge)
  },
  clear(): void {
    localStorage.removeItem(CHALLENGE_STORAGE_KEY)
  }
}

/**
 * Get the social login URL for the web app
 */
export function getLoginUrl(): string {
  const encryptedChallenge = codeChallenge.generate()
  return `${window.env.WEB_URL}/login?challenge=${encryptedChallenge}`
}

/**
 * Handle the deep link callback with token
 */
export async function handleDeepLinkToken(token: string, challenge: string): Promise<boolean> {
  // Validate code challenge
  if (!codeChallenge.verify(challenge)) {
    console.error('Code challenge verification failed')
    return false
  }

  // Store token
  bearerToken.set(token)
  codeChallenge.clear()

  // Get session and update store
  try {
    const session = await authClient.getSession()
    if (session?.data?.user) {
      const store = useAuthStore.getState()
      store.setUser(session.data.user)
      store.setToken(token)
      return true
    }
    return false
  } catch (error) {
    console.error('Failed to fetch user:', error)
    bearerToken.remove()
    return false
  }
}
