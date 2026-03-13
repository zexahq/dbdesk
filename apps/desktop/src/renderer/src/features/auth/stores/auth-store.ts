import { create } from 'zustand'

interface AuthUser {
  id: string
  name: string
  email: string
  image: string | null
}

interface AuthState {
  user: AuthUser | null
  /** In-memory token cache — sourced from safeStorage via IPC, never persisted in renderer */
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean

  setUser: (user: AuthUser | null) => void
  setToken: (token: string | null) => void
  setIsLoading: (loading: boolean) => void
  logout: () => void

  /**
   * Fetch session + token from the main process and update the store.
   * Called on startup and whenever the main process signals a change.
   */
  refreshSession: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
    }),

  setToken: (token) =>
    set({
      token,
    }),

  setIsLoading: (isLoading) => set({ isLoading }),

  logout: () =>
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    }),

  refreshSession: async () => {
    try {
      console.log('[auth-store] refreshSession called')
      const [session, tokenResult] = await Promise.all([
        window.dbdesk.getSession(),
        window.dbdesk.getToken(),
      ])
      console.log('[auth-store] refreshSession result:', { hasUser: !!session?.user, hasToken: !!tokenResult?.token })

      if (session?.user) {
        set({
          user: session.user,
          token: tokenResult.token,
          isAuthenticated: true,
          isLoading: false,
        })
      } else {
        // Only clear auth state if we weren't already authenticated.
        // After deep-link auth the token store write may still be in-flight,
        // so getSession() can transiently return null. Preserve the user that
        // was set directly by onAuthenticated; only logout() should clear it.
        const current = useAuthStore.getState()
        if (!current.isAuthenticated) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          })
        } else {
          set({ isLoading: false })
        }
      }
    } catch (err) {
      console.error('[auth-store] refreshSession error:', err)
      set({ isLoading: false })
    }
  },
}))
