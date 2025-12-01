import { createRootRoute, Navigate, Outlet } from '@tanstack/react-router'
// import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { MainSidebar } from '@renderer/components/main-sidebar'
import { Toaster } from 'react-hot-toast'

const RootLayout = () => (
  <div className="flex h-screen overflow-hidden">
    <MainSidebar />
    <div className="flex-1 h-full overflow-y-auto">
      <Outlet />
    </div>
    <Toaster position="top-center" />
    {/* <TanStackRouterDevtools position="bottom-right" /> */}
  </div>
)

const NotFound = () => <Navigate to="/" replace />

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound
})
