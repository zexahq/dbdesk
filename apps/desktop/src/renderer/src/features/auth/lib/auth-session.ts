import { redirect } from '@tanstack/react-router'
import { useAuthStore } from '@renderer/features/auth/stores/auth-store'

export async function syncAuthState() {
  await useAuthStore.getState().refreshSession()
  return useAuthStore.getState()
}

export async function requireAuth(pathname: string) {
  const authState = await syncAuthState()
  const isAuthRoute = pathname === '/auth'

  if (!authState.isAuthenticated && !isAuthRoute) {
    throw redirect({ to: '/auth' })
  }

  if (authState.isAuthenticated && isAuthRoute) {
    throw redirect({ to: '/' })
  }

  return authState
}
