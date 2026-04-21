import { createRootRoute, Navigate, Outlet, useMatches } from '@tanstack/react-router'
import { Titlebar } from '@renderer/components/shell/titlebar'
import { Toaster } from '@renderer/components/ui/sonner'
import { useAuthStore } from '@renderer/features/auth/stores/auth-store'
import { MainSidebar } from '@renderer/components/shell/main-sidebar'
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
      <Toaster position="top-right" />
    </>
  )
}

const NotFound = () => <Navigate to="/" replace />

export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    const { isAuthenticated } = useAuthStore.getState()
    const pathname = location.pathname ?? '/'
    const isAuthRoute = pathname === '/auth'

    if (!isAuthenticated && !isAuthRoute) {
      throw redirect({ to: '/auth' })
    }

    if (isAuthenticated && isAuthRoute) {
      throw redirect({ to: '/' })
    }
  },
  component: RootLayout,
  notFoundComponent: NotFound
})
