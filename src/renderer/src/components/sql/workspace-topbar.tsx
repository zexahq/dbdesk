import type { SQLConnectionProfile } from '@common/types'
import { useDisconnect } from '@renderer/api/queries/connections'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'
import { saveCurrentWorkspace } from '@renderer/lib/workspace'
import { useSavedQueriesStore } from '@renderer/store/saved-queries-store'
import { useSqlWorkspaceStore } from '@renderer/store/sql-workspace-store'
import { type QueryTab, useTabStore } from '@renderer/store/tab-store'
import { useRouter } from '@tanstack/react-router'
import {
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  SquareCode,
  Table2Icon,
  Unplug,
  X
} from 'lucide-react'

interface WorkspaceTopbarProps {
  profile: SQLConnectionProfile
  isSidebarOpen: boolean
  onSidebarOpenChange: (open: boolean) => void
}

export function WorkspaceTopbar({
  profile,
  isSidebarOpen,
  onSidebarOpenChange
}: WorkspaceTopbarProps) {
  const router = useRouter()
  const { mutate: disconnect, isPending: isDisconnecting } = useDisconnect()

  const tabs = useTabStore((s) => s.tabs)
  const activeTabId = useTabStore((s) => s.activeTabId)
  const setActiveTab = useTabStore((s) => s.setActiveTab)
  const removeTab = useTabStore((s) => s.removeTab)
  const addQueryTab = useTabStore((s) => s.addQueryTab)
  const reset = useTabStore((s) => s.reset)

  const { queries } = useSavedQueriesStore()
  const { reset: resetWorkspace } = useSqlWorkspaceStore()

  const isQueryTabSaved = (tab: QueryTab) => queries.some((q) => q.id === tab.id)

  const isQueryTabDirty = (tab: QueryTab) => {
    if (tab.lastSavedContent === undefined) return false
    return tab.editorContent !== tab.lastSavedContent
  }

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId)
  }

  const handleCloseTab = (tabId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    removeTab(tabId)
  }

  const handleAddQueryTab = () => {
    addQueryTab()
  }

  const handleDisconnect = async () => {
    await saveCurrentWorkspace()

    disconnect(profile.id, {
      onSuccess: () => {
        resetWorkspace()
        reset()
        router.navigate({ to: '/' })
      }
    })
  }

  return (
    <div className="border-b h-10 bg-muted/20 flex items-center">
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

      <div className="flex-1 h-full overflow-x-auto no-scrollbar">
        <div className="flex h-full items-center">
          {tabs.map((tab) => {
            const isActive = activeTabId === tab.id
            const isQueryTab = tab.kind === 'query'
            const isDirty = isQueryTab ? isQueryTabDirty(tab) : false
            const isSaved = isQueryTab ? isQueryTabSaved(tab) : true

            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={cn(
                  'group flex items-center gap-2 px-4 text-sm transition-colors whitespace-nowrap h-full border-r border-border/50 min-w-[120px] max-w-[200px]',
                  'hover:bg-background/60 cursor-pointer',
                  isActive
                    ? 'bg-background text-foreground border-t-2 border-t-primary pt-0.5'
                    : 'text-muted-foreground border-t-2 border-t-transparent pt-0.5',
                  (tab.isTemporary || (isQueryTab && !isSaved)) && 'italic'
                )}
              >
                {tab.kind === 'table' ? (
                  <Table2Icon className="size-3.5 shrink-0" />
                ) : (
                  <SquareCode className="size-3.5 shrink-0" />
                )}
                {isDirty && <span className="size-2 rounded-full bg-amber-500 shrink-0" />}
                <span className="truncate flex-1 text-left">
                  {tab.kind === 'table' ? tab.table : tab.name}
                </span>
                <div
                  role="button"
                  onClick={(e) => handleCloseTab(tab.id, e)}
                  className={cn(
                    'rounded-sm opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/20 p-0.5 transition-opacity',
                    isActive && 'opacity-100'
                  )}
                >
                  <X className="size-3" />
                  <span className="sr-only">Close tab</span>
                </div>
              </button>
            )
          })}
          <button
            onClick={handleAddQueryTab}
            className="flex items-center justify-center h-full w-10 border-r border-border/50 hover:bg-background/60 cursor-pointer shrink-0"
            title="New Query"
          >
            <Plus className="size-4 text-muted-foreground" />
            <span className="sr-only">New query tab</span>
          </button>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-full w-10 cursor-pointer rounded-none border-l border-border/50 shrink-0 hover:bg-destructive/10 hover:text-destructive"
        onClick={() => void handleDisconnect()}
        disabled={isDisconnecting}
      >
        <Unplug className="size-4" />
        <span className="sr-only">Disconnect</span>
      </Button>
    </div>
  )
}
