import { Link, useLocation } from '@tanstack/react-router'
import { Home } from 'lucide-react'
import { QuickPanel } from './quick-panel'
import { ThemeToggle } from './theme-toggle'
import { Button } from './ui/button'

export function MainSidebar() {
  const location = useLocation()
  const isConnectionPage = location.pathname.startsWith('/connections/')

  return (
    <div className="border-b bg-main-sidebar backdrop-blur py-4 border-r">
      <div className="px-2 h-full flex flex-col items-center justify-between">
        <div className="flex flex-col gap-2 items-center">
          {!isConnectionPage && (
            <Button variant="ghost" size="icon" className="cursor-pointer" asChild>
              <Link to="/" className="[&.active]:font-bold">
                <Home className="size-4" />
              </Link>
            </Button>
          )}
          <QuickPanel />
        </div>
        <div className="flex flex-col gap-2 items-center">
          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}
