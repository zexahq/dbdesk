import { useMatches, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { authClient, bearerToken } from '@renderer/lib/auth'
import { useAppStore } from '@renderer/store/app-store'
import { useAuthStore } from '@renderer/store/auth-store'

/**
 * Monitors session state and manages navigation between protected and public routes
 * Handles offline access when user has valid credentials but server is unreachable
 */
export function AuthObserver() {
  const { data, error, isPending } = authClient.useSession()
  const isOnline = useAppStore((state) => state.isOnline)
  const setIsLoading = useAuthStore((state) => state.setIsLoading)
  const router = useRouter()
  const match = useMatches({
    select: (matches) => matches.map((match) => match.routeId).at(-1)
  })

  const hasCredentialsButServerError = !!bearerToken.get() && !!error

  // Sync routing with session state
  useEffect(() => {
    if (isPending) return

    setIsLoading(false)
    /**
     * Allow offline access with stored credentials
     * Keep user on current page if they were already authenticated
     */
    if (hasCredentialsButServerError) {
      if (match === '/auth') router.navigate({ to: '/' })
      return
    }

    // Route authenticated users away from login
    if (data?.user && match === '/auth') {
      router.navigate({ to: '/' })
    }

    // Route unauthenticated users to login
    if (!data?.user && match !== '/auth') {
      router.navigate({ to: '/auth' })
    }
  }, [router, isPending, data?.user, match, hasCredentialsButServerError])

  // Notify user when in offline mode
  useEffect(() => {
    if (hasCredentialsButServerError && isOnline) {
      toast.error(
        'Server connection lost. You can continue working offline, but some features may not work as expected.'
      )
    }
    if (hasCredentialsButServerError && !isOnline) {
      toast.error('Connection unavailable. You can still work on offline databases.')
    }
  }, [hasCredentialsButServerError, isOnline])

  return null
}
