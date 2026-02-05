import { decryptChallenge, encryptChallenge, generateCodeChallenge } from './crypto'
import { authClient, bearerToken } from './auth'
import { useAuthStore } from '@renderer/store/auth-store'

const CHALLENGE_STORAGE_KEY = 'dbdesk_auth_challenge'
const SECRET_KEY = import.meta.env.VITE_AUTH_SECRET || 'default-secret-key-change-in-prod'
const WEB_URL = import.meta.env.VITE_WEB_URL || 'http://localhost:3000'

/**
 * Store and manage code challenge
 */
export const codeChallenge = {
  generate(): string {
    const challenge = generateCodeChallenge()
    const encrypted = encryptChallenge(challenge, SECRET_KEY)
    localStorage.setItem(CHALLENGE_STORAGE_KEY, encrypted)
    return challenge
  },
  verify(challenge: string): boolean {
    const encrypted = localStorage.getItem(CHALLENGE_STORAGE_KEY)
    if (!encrypted) return false

    try {
      const decrypted = decryptChallenge(encrypted, SECRET_KEY)
      return decrypted === challenge
    } catch (error) {
      console.error('Failed to decrypt challenge:', error)
      return false
    }
  },
  clear(): void {
    localStorage.removeItem(CHALLENGE_STORAGE_KEY)
  }
}

/**
 * Get the social login URL for the web app
 */
export function getLoginUrl(): string {
  const challenge = codeChallenge.generate()
  return `${WEB_URL}/login?challenge=${challenge}`
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
