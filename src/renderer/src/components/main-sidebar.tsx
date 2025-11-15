import { Link } from '@tanstack/react-router'
import { Info } from 'lucide-react'
import { ThemeToggle } from './theme-toggle'
import { Button } from './ui/button'
import { QuickPanel } from './quick-panel'

export function MainSidebar() {
  return (
    <div className="border-b bg-main-sidebar backdrop-blur py-4 border-r">
      <div className="px-2 h-full flex flex-col items-center justify-between">
        <div className="flex flex-col gap-2 items-center">
          <QuickPanel />
        </div>
        <div className="flex flex-col gap-2 items-center">
          <ThemeToggle />
          <Button variant="ghost" size="icon" className="cursor-pointer" asChild>
            <Link to="/about" className="[&.active]:font-bold">
              <Info className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
