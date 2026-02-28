import { useMatches, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { useAppStore } from '@renderer/shared/stores/app-store'
import { useAuthStore } from '@renderer/features/auth/stores/auth-store'
import { Loader2 } from 'lucide-react'

/**
 * Monitors session state and manages navigation between protected and public routes.
 * On mount, fetches the session from the main process (which reads safeStorage).
 */
export function AuthObserver() {
  const isOnline = useAppStore((state) => state.isOnline)
  const { isLoading, isAuthenticated, refreshSession, token } = useAuthStore()
  const router = useRouter()
  const match = useMatches({
    select: (matches) => matches.map((match) => match.routeId).at(-1),
  })

  // Fetch session on mount
  useEffect(() => {
    void refreshSession()
  }, [])

  // Sync routing with session state
  useEffect(() => {
    if (isLoading) return

    // Route authenticated users away from login
    if (isAuthenticated && match === '/auth') {
      router.navigate({ to: '/' })
    }

    // Route unauthenticated users to login
    if (!isAuthenticated && match !== '/auth') {
      router.navigate({ to: '/auth' })
    }
  }, [router, isLoading, isAuthenticated, match])

  // Notify user when token exists but session fetch may have failed
  useEffect(() => {
    if (token && !isAuthenticated && !isLoading && isOnline) {
      toast.error(
        'Server connection lost. You can continue working offline, but some features may not work as expected.',
      )
    }
    if (token && !isAuthenticated && !isLoading && !isOnline) {
      toast.error('Connection unavailable. You can still work on offline databases.')
    }
  }, [token, isAuthenticated, isLoading, isOnline])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
      </div>
    )
  }

  return null
}
