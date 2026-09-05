import { createRootRoute, Navigate, Outlet, useMatches } from '@tanstack/react-router'
import { Titlebar } from '@renderer/components/shell/titlebar'
import { Toaster } from '@renderer/components/ui/sonner'
import { useAuthStore } from '@renderer/features/auth/stores/auth-store'
import { MainSidebar } from '@renderer/components/shell/main-sidebar'
import { AuthOverlay } from '@renderer/features/auth/components/auth-overlay'
import { CliInstallPrompt } from '@renderer/components/shell/cli-install-prompt'
import { useUpdateToast } from '@renderer/shared/hooks/use-update-toast'
import { redirect } from '@tanstack/react-router'

const RootLayout = () => {
  useUpdateToast()
  const matches = useMatches()
  const isAuthRoute = matches.some((match) => match.routeId === '/auth')

  return (
    <>
      <div className="h-full flex flex-col overflow-hidden">
        <Titlebar />
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {!isAuthRoute && <MainSidebar />}
          <main className="flex-1 min-h-0 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
      <AuthOverlay />
      <Toaster position="top-right" />
      <CliInstallPrompt />
    </>
  )
}

const NotFound = () => <Navigate to="/" replace />

export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    const { isAuthenticated, sessionExpired } = useAuthStore.getState()
    const pathname = location.pathname ?? '/'
    const isAuthRoute = pathname === '/auth'

    // If the session expired in the background, don't redirect —
    // keep the user on the current page with the sign-in overlay.
    if (!isAuthenticated && !isAuthRoute && !sessionExpired) {
      throw redirect({ to: '/auth' })
    }

    if (isAuthenticated && isAuthRoute) {
      throw redirect({ to: '/' })
    }
  },
  component: RootLayout,
  notFoundComponent: NotFound
})
