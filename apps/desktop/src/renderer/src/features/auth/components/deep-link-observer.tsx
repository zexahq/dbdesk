import { useEffect } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useAuthStore } from '@renderer/features/auth/stores/auth-store'

/**
 * Listens for auth session changes broadcast by the main process
 * after a successful deep-link PKCE exchange.
 */
export function DeepLinkObserver() {
  const refreshSession = useAuthStore((state) => state.refreshSession)
  const router = useRouter()

  useEffect(() => {
    const cleanup = window.dbdesk?.onAuthSessionChanged(async () => {
      await refreshSession()
      router.navigate({ to: '/' })
    })

    return () => {
      cleanup?.()
    }
  }, [router, refreshSession])

  return null
}
