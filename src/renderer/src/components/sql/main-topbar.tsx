import type { SQLConnectionProfile } from '@common/types'
import { useDisconnect } from '@renderer/api/queries/connections'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'
import { useSqlWorkspaceStore } from '@renderer/store/sql-workspace-store'
import { useTabStore } from '@renderer/store/tab-store'
import { useRouter } from '@tanstack/react-router'
import { PanelLeftClose, PanelLeftOpen, Unplug, X } from 'lucide-react'

interface MainTopbarProps {
  profile: SQLConnectionProfile
  isSidebarOpen: boolean
  onSidebarOpenChange: (open: boolean) => void
}

export function MainTopbar({ profile, isSidebarOpen, onSidebarOpenChange }: MainTopbarProps) {
  const router = useRouter()
  const { mutate: disconnect, isPending: isDisconnecting } = useDisconnect()
  const { reset: resetWorkspace } = useSqlWorkspaceStore()
  const { tabs, activeTabId, setActiveTab, removeTab } = useTabStore()

  const handleDisconnect = () => {
    disconnect(profile.id, {
      onSuccess: () => {
        resetWorkspace()
        router.navigate({ to: '/' })
      }
    })
  }

  const handleCloseTab = (tabId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    removeTab(tabId)
  }

  return (
    <div className="border-b h-10 bg-muted/20 flex items-center">
      {/* Sidebar toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="h-full w-10 rounded-none border-r border-border/50 shrink-0"
        onClick={() => onSidebarOpenChange(!isSidebarOpen)}
      >
        {isSidebarOpen ? (
          <PanelLeftClose className="size-4" />
        ) : (
          <PanelLeftOpen className="size-4" />
        )}
        <span className="sr-only">Toggle sidebar</span>
      </Button>

      {/* Tabs */}
      <div className="flex-1 h-full overflow-x-auto no-scrollbar">
        <div className="flex h-full items-center">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'group flex items-center gap-2 px-4 text-sm transition-colors whitespace-nowrap h-full border-r border-border/50 min-w-[120px] max-w-[200px]',
                'hover:bg-background/60 cursor-pointer',
                activeTabId === tab.id
                  ? 'bg-background text-foreground border-t-2 border-t-primary pt-0.5'
                  : 'text-muted-foreground border-t-2 border-t-transparent pt-0.5'
              )}
            >
              <span className={cn('truncate flex-1 text-left', tab.isTemporary && 'italic')}>
                {tab.table}
              </span>
              <div
                role="button"
                onClick={(e) => handleCloseTab(tab.id, e)}
                className={cn(
                  'rounded-sm opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/20 p-0.5 transition-opacity',
                  activeTabId === tab.id && 'opacity-100'
                )}
              >
                <X className="size-3" />
                <span className="sr-only">Close tab</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Disconnect button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-full w-10 cursor-pointer rounded-none border-l border-border/50 shrink-0 hover:bg-destructive/10 hover:text-destructive"
        onClick={handleDisconnect}
        disabled={isDisconnecting}
      >
        <Unplug className="size-4" />
        <span className="sr-only">Disconnect</span>
      </Button>
    </div>
  )
}
