import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { TopBar } from '../components/topbar'

const RootLayout = () => (
  <div className="h-screen overflow-hidden">
    <TopBar />
    <div className="h-[calc(100vh-32px)] overflow-hidden">
      <Outlet />
    </div>
    <TanStackRouterDevtools position="bottom-right" />
  </div>
)

export const Route = createRootRoute({ component: RootLayout })
