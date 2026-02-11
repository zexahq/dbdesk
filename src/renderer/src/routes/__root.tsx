import { createRootRoute, Navigate, Outlet } from '@tanstack/react-router'
import { useEffect } from 'react'
// import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { MainSidebar } from '@renderer/components/main-sidebar'
import { Titlebar } from '@renderer/components/titlebar'
import { Toaster } from '@renderer/components/ui/sonner'
import { useDashboardStore } from '@renderer/store/dashboard-store'

const RootLayout = () => {
  const { persistAllDashboards, currentDashboard } = useDashboardStore()

  // Persist dashboards when window is about to close
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Fire-and-forget persist call
      // The main process will also persist on app quit, but this is a best-effort attempt
      if (currentDashboard) {
        persistAllDashboards().catch(console.error)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [persistAllDashboards, currentDashboard])

  return (
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
}

const NotFound = () => <Navigate to="/" replace />

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound
})
