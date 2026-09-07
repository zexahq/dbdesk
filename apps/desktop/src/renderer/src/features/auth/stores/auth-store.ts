import { create } from 'zustand'

interface AuthUser {
  id: string
  name: string
  email: string
  image?: string | null
}

export interface AuthState {
  user: AuthUser | null
  /** In-memory token cache — sourced from safeStorage via IPC, never persisted in renderer */
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  /** Set to true when the background session verification finds the session expired.
   *  The user stays on the current page but sees a sign-in overlay. */
  sessionExpired: boolean

  setUser: (user: AuthUser | null) => void
  setToken: (token: string | null) => void
  setIsLoading: (loading: boolean) => void
  setSessionExpired: (expired: boolean) => void
  logout: () => void

  /**
   * Fetch session + token from the main process and update the store.
   * Returns instantly from the local cache — no network call on startup.
   */
  refreshSession: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  sessionExpired: false,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user
    }),

  setToken: (token) =>
    set({
      token
    }),

  setIsLoading: (isLoading) => set({ isLoading }),

  setSessionExpired: (sessionExpired) => set({ sessionExpired }),

  logout: () =>
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      sessionExpired: false
    }),

  refreshSession: async () => {
    try {
      const [session, tokenResult] = await Promise.all([
        window.dbdesk.getSession(),
        window.dbdesk.getToken()
      ])

      if (session?.user) {
        set({
          user: session.user,
          token: tokenResult.token,
          isAuthenticated: true,
          isLoading: false,
          sessionExpired: false
        })
      } else {
        // No cached session — this is the first-time / logged-out flow.
        // Don't clear auth state if already authenticated (deep-link race).
        const current = useAuthStore.getState()
        if (!current.isAuthenticated) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            sessionExpired: false
          })
        } else {
          set({ isLoading: false })
        }
      }
    } catch (err) {
      console.error('[auth-store] refreshSession error:', err)
      set({ isLoading: false })
    }
  }
}))
