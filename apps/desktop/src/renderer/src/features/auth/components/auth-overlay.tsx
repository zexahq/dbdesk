import { useAuthStore } from '@renderer/features/auth/stores/auth-store'
import { requestSignIn } from '@renderer/features/auth/lib/auth-utils'
import { Button } from '@renderer/components/ui/button'
import DbDeskLogo from '@renderer/assets/dbdesk-logo.svg'

/**
 * Full-screen overlay shown when the background session verification
 * finds the session expired.  The user's page stays visible underneath
 * so they don't lose context.
 */
export function AuthOverlay() {
  const sessionExpired = useAuthStore((s) => s.sessionExpired)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  if (!sessionExpired || isAuthenticated) return null

  const handleLogin = async () => {
    try {
      await requestSignIn()
    } catch (error) {
      console.error('[auth-overlay] Failed to initiate login:', error)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md space-y-8 rounded-lg p-8 flex flex-col bg-background shadow-2xl">
        <div className="flex flex-col gap-2">
          <img src={DbDeskLogo} alt="DBDesk" className="h-8 w-8" />
          <h1 className="text-2xl flex items-center font-bold">Session expired</h1>
          <p className="text-sm text-muted-foreground">
            Your session has expired. Please sign in again to continue.
          </p>
        </div>

        <div className="space-y-3">
          <Button onClick={handleLogin} variant="default" className="w-full" size="sm">
            Sign in
          </Button>
        </div>
      </div>
    </div>
  )
}
