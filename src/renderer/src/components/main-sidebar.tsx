import { Link } from '@tanstack/react-router'
import { Home, Info } from 'lucide-react'
import { ThemeToggle } from './theme-toggle'
import { Button } from './ui/button'
import { QuickPanel } from './quick-panel'

export function MainSidebar() {
  return (
    <div className="border-b bg-main-sidebar backdrop-blur py-4 border-r">
      <div className="px-2 h-full flex flex-col items-center justify-between">
        <div className="flex flex-col gap-2 items-center">
          <Button variant="ghost" size="icon" className="cursor-pointer" asChild>
            <Link to="/" className="[&.active]:font-bold">
              <Home className="size-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" className="cursor-pointer" asChild>
            <Link to="/about" className="[&.active]:font-bold">
              <Info className="size-4" />
            </Link>
          </Button>

          <QuickPanel />
        </div>
        <ThemeToggle />
      </div>
    </div>
  )
}
