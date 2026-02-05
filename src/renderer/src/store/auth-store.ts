import { create } from 'zustand'
import type { User } from 'better-auth'

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean

  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  setIsLoading: (loading: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user
    }),

  setToken: (token) =>
    set({
      token,
      isAuthenticated: !!token
    }),

  setIsLoading: (isLoading) => set({ isLoading }),

  logout: () =>
    set({
      user: null,
      token: null,
      isAuthenticated: false
    })
}))
