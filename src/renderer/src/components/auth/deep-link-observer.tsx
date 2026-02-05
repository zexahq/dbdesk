import { useEffect } from 'react'
import { useRouter } from '@tanstack/react-router'
import { handleDeepLinkToken } from '@renderer/lib/auth-utils'
import { authClient } from '@renderer/lib/auth'
import { useAuthStore } from '@renderer/store/auth-store'

/**
 * Component that observes deep link callbacks from the main process
 * Listens for auth token handoff from the web app
 */
export function DeepLinkObserver() {
  const setIsLoading = useAuthStore((state) => state.setIsLoading)
  const { refetch } = authClient.useSession()
  const router = useRouter()

  useEffect(() => {
    // Register listener for deep link auth callbacks
    const cleanup = window.dbdesk?.onDeepLink(async (data) => {
      setIsLoading(true)
      try {
        const success = await handleDeepLinkToken(data.token, data.challenge)
        if (success) {
          await refetch()
          router.navigate({ to: '/' })
        } else {
          console.error('Failed to authenticate via deep link')
        }
      } catch (error) {
        console.error('Deep link authentication error:', error)
      } finally {
        setIsLoading(false)
      }
    })

    return () => {
      cleanup?.()
    }
  }, [router, refetch])

  return null
}
