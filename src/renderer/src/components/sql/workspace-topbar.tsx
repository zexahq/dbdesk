import type { SQLConnectionProfile } from '@common/types'
import { useDisconnect } from '@renderer/api/queries/connections'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'
import { saveCurrentWorkspace } from '@renderer/lib/workspace'
import { type QueryTab, useQueryTabStore } from '@renderer/store/query-tab-store'
import { useSavedQueriesStore } from '@renderer/store/saved-queries-store'
import { useSqlWorkspaceStore } from '@renderer/store/sql-workspace-store'
import { useTabStore } from '@renderer/store/tab-store'
import { useRouter } from '@tanstack/react-router'
import { SquareCode, PanelLeftClose, PanelLeftOpen, Plus, Table2Icon, Unplug, X } from 'lucide-react'

interface WorkspaceTopbarProps {
  profile: SQLConnectionProfile
  isSidebarOpen: boolean
  onSidebarOpenChange: (open: boolean) => void
}

type WorkspaceTabKind = 'table' | 'query'

interface WorkspaceTabVM {
  kind: WorkspaceTabKind
  id: string
  name: string
  isActive: boolean
  isTemporary?: boolean
  isDirty?: boolean
  isSaved?: boolean
}

export function WorkspaceTopbar({
  profile,
  isSidebarOpen,
  onSidebarOpenChange
}: WorkspaceTopbarProps) {
  const router = useRouter()
  const { mutate: disconnect, isPending: isDisconnecting } = useDisconnect()

  // Table tabs store
  const tableTabs = useTabStore((s) => s.tabs)
  const activeTableTabId = useTabStore((s) => s.activeTabId)
  const setActiveTableTab = useTabStore((s) => s.setActiveTab)
  const removeTableTab = useTabStore((s) => s.removeTab)
  const resetTableTabs = useTabStore((s) => s.reset)

  // Query tabs store
  const queryTabs = useQueryTabStore((s) => s.tabs)
  const activeQueryTabId = useQueryTabStore((s) => s.activeTabId)
  const setActiveQueryTab = useQueryTabStore((s) => s.setActiveTab)
  const removeQueryTab = useQueryTabStore((s) => s.removeTab)
  const addQueryTab = useQueryTabStore((s) => s.addTab)
  const resetQueryTabs = useQueryTabStore((s) => s.reset)

  // Saved queries for checking if query tab is saved
  const { queries } = useSavedQueriesStore()

  // Workspace view
  const { view, setView, reset: resetWorkspace } = useSqlWorkspaceStore()

  // Check if a query tab is saved
  const isQueryTabSaved = (tab: QueryTab) => queries.some((q) => q.id === tab.id)

  // Check if a query tab is dirty
  const isQueryTabDirty = (tab: QueryTab) => {
    if (tab.lastSavedContent === undefined) return false
    return tab.editorContent !== tab.lastSavedContent
  }

  // Build unified workspace tabs view model
  const workspaceTabs: WorkspaceTabVM[] = [
    ...tableTabs.map((t) => ({
      kind: 'table' as const,
      id: t.id,
      name: t.table,
      isActive: view === 'table' && activeTableTabId === t.id,
      isTemporary: t.isTemporary
    })),
    ...queryTabs.map((q) => ({
      kind: 'query' as const,
      id: q.id,
      name: q.name,
      isActive: view === 'query' && activeQueryTabId === q.id,
      isDirty: isQueryTabDirty(q),
      isSaved: isQueryTabSaved(q)
    }))
  ]

  const handleTabClick = (tab: WorkspaceTabVM) => {
    if (tab.kind === 'table') {
      setActiveTableTab(tab.id)
      setView('table')
    } else {
      setActiveQueryTab(tab.id)
      setView('query')
    }
  }

  const handleCloseTab = (tab: WorkspaceTabVM, event: React.MouseEvent) => {
    event.stopPropagation()

    if (tab.kind === 'table') {
      removeTableTab(tab.id)
      // If closing active table tab and there are query tabs, switch to query view
      if (tab.isActive && tableTabs.length === 1 && queryTabs.length > 0) {
        setView('query')
      }
    } else {
      removeQueryTab(tab.id)
      // If closing active query tab and there are table tabs, switch to table view
      if (tab.isActive && queryTabs.length === 1 && tableTabs.length > 0) {
        setView('table')
      }
    }
  }

  const handleAddQueryTab = () => {
    addQueryTab()
    setView('query')
  }

  const handleDisconnect = async () => {
    await saveCurrentWorkspace()

    disconnect(profile.id, {
      onSuccess: () => {
        resetWorkspace()
        resetTableTabs()
        resetQueryTabs()
        router.navigate({ to: '/' })
      }
    })
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
          {workspaceTabs.map((tab) => (
            <button
              key={`${tab.kind}-${tab.id}`}
              onClick={() => handleTabClick(tab)}
              className={cn(
                'group flex items-center gap-2 px-4 text-sm transition-colors whitespace-nowrap h-full border-r border-border/50 min-w-[120px] max-w-[200px]',
                'hover:bg-background/60 cursor-pointer',
                tab.isActive
                  ? 'bg-background text-foreground border-t-2 border-t-primary pt-0.5'
                  : 'text-muted-foreground border-t-2 border-t-transparent pt-0.5',
                // Italic for temporary table tabs or unsaved query tabs
                (tab.isTemporary || (tab.kind === 'query' && !tab.isSaved)) && 'italic'
              )}
            >
              {/* Tab icon */}
              {tab.kind === 'table' ? (
                <Table2Icon className="size-3.5 shrink-0" />
              ) : (
                <SquareCode className="size-3.5 shrink-0" />
              )}
              {/* Dirty indicator for query tabs */}
              {tab.isDirty && <span className="size-2 rounded-full bg-amber-500 shrink-0" />}
              <span className="truncate flex-1 text-left">{tab.name}</span>
              <div
                role="button"
                onClick={(e) => handleCloseTab(tab, e)}
                className={cn(
                  'rounded-sm opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/20 p-0.5 transition-opacity',
                  tab.isActive && 'opacity-100'
                )}
              >
                <X className="size-3" />
                <span className="sr-only">Close tab</span>
              </div>
            </button>
          ))}
          {/* Add new query tab button */}
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

      {/* Disconnect button */}
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
