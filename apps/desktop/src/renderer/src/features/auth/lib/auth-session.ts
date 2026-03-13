import { redirect } from '@tanstack/react-router'
import { useAuthStore } from '@renderer/features/auth/stores/auth-store'

export async function syncAuthState() {
  const currentState = useAuthStore.getState()

  // If the user is already set (e.g., from onAuthenticated callback after deep-link),
  // return immediately. This avoids a race condition where the tokenStore file write
  // for the session cookie hasn't completed yet, causing getSession() to return null.
  if (currentState.isAuthenticated && currentState.user) {
    return currentState
  }

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
