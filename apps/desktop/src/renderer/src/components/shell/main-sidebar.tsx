import { UserMenu } from '@renderer/features/auth/components/user-menu'
import { useSqlWorkspaceStore } from '@renderer/features/sql-workspace/stores/sql-workspace-store'
import type { SidebarViewMode } from '@renderer/features/sql-workspace/stores/sql-workspace-store'
import { DatabaseIcon, FileText, LayoutDashboard } from 'lucide-react'
import { cn } from '@renderer/shared/lib/utils'
import { QuickPanel } from './quick-panel'
import { Button } from '@renderer/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'

const VIEW_MODES: { mode: SidebarViewMode; icon: typeof DatabaseIcon; label: string }[] = [
  { mode: 'schemas', icon: DatabaseIcon, label: 'Schemas' },
  { mode: 'queries', icon: FileText, label: 'Saved Queries' },
  { mode: 'dashboards', icon: LayoutDashboard, label: 'Dashboards' }
]

export function MainSidebar() {
  const currentConnectionId = useSqlWorkspaceStore((s) => s.currentConnectionId)
  const sidebarViewMode = useSqlWorkspaceStore((s) => s.sidebarViewMode)
  const setSidebarViewMode = useSqlWorkspaceStore((s) => s.setSidebarViewMode)

  return (
    <div className="bg-main-sidebar backdrop-blur py-2">
      <div className="px-2 h-full flex flex-col items-center justify-between">
        <div className="flex flex-col gap-2 items-center">
          <QuickPanel />
          {currentConnectionId && (
            <div className="flex flex-col gap-1 items-center pt-1">
              {VIEW_MODES.map(({ mode, icon: Icon, label }) => {
                const isActive = sidebarViewMode === mode
                return (
                  <Tooltip key={mode}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          'h-8 w-8 cursor-pointer',
                          isActive && 'bg-accent text-accent-foreground'
                        )}
                        onClick={() => setSidebarViewMode(mode)}
                      >
                        <Icon className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">{label}</TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 items-center">
          <UserMenu />
        </div>
      </div>
    </div>
  )
}
