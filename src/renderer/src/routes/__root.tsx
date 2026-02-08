import { createRootRoute, Navigate, Outlet, useMatches } from '@tanstack/react-router'
import { Titlebar } from '@renderer/components/titlebar'
import { Toaster } from '@renderer/components/ui/sonner'
import { AuthObserver } from '@renderer/components/auth/auth-observer'
import { DeepLinkObserver } from '@renderer/components/auth/deep-link-observer'
import { MainSidebar } from '@renderer/components/main-sidebar'

const RootLayout = () => {
  const matches = useMatches()
  const isAuthRoute = matches.some((match) => match.routeId === '/auth')

  return (
    <>
      <div className="h-full flex flex-col overflow-hidden">
        <Titlebar />
        <AuthObserver />
        <DeepLinkObserver />
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
  component: RootLayout,
  notFoundComponent: NotFound
})
