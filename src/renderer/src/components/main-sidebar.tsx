import { QuickPanel } from './quick-panel'
import { ThemeToggle } from './theme-toggle'

export function MainSidebar() {
  return (
    <div className="bg-main-sidebar backdrop-blur py-2">
      <div className="px-2 h-full flex flex-col items-center justify-between">
        <div className="flex flex-col gap-2 items-center">
          <QuickPanel />
        </div>
        <div className="flex flex-col gap-2 items-center">
          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}
