import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { MainSidebar } from '@renderer/components/main-sidebar'

const RootLayout = () => (
  <div className="h-screen overflow-hidden flex">
    <MainSidebar />
    <div className="h-full overflow-hidden flex-1">
      <Outlet />
    </div>
    <TanStackRouterDevtools position="bottom-right" />
  </div>
)

export const Route = createRootRoute({ component: RootLayout })
