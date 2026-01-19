import { createRootRoute, Navigate, Outlet } from '@tanstack/react-router'
// import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { MainSidebar } from '@renderer/components/main-sidebar'
import { Titlebar } from '@renderer/components/titlebar'
import { Toaster } from '@renderer/components/ui/sonner'

const RootLayout = () => (
  <div className="h-full flex flex-col overflow-hidden">
    <Titlebar />
    <div className="flex flex-1 min-h-0 overflow-hidden select-none">
      <MainSidebar />
      <main className="flex-1 min-h-0 overflow-y-auto">
        <Outlet />
      </main>
      <Toaster position="top-right" />
    </div>
  </div>
)

const NotFound = () => <Navigate to="/" replace />

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound
})
