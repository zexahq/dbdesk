import { createRootRoute, Navigate, Outlet, useMatches } from '@tanstack/react-router'
import { Titlebar } from '@renderer/components/shell/titlebar'
import { Toaster } from '@renderer/components/ui/sonner'
import { requireAuth } from '@renderer/features/auth/lib/auth-session'
import { MainSidebar } from '@renderer/components/shell/main-sidebar'

const RootLayout = () => {
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
  beforeLoad: async ({ location }) => {
    await requireAuth(location.pathname)
  },
  component: RootLayout,
  notFoundComponent: NotFound
})
