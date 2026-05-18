import type { SQLConnectionProfile } from '@dbdesk/shared/types'
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core'
import { horizontalListSortingStrategy, SortableContext } from '@dnd-kit/sortable'
import { useDisconnect } from '@renderer/features/connections/queries/connections'
import { TabNavigation } from '@renderer/features/sql-workspace/components/table-view/tab-navigation'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { useWorkspaceTabs } from '@renderer/features/sql-workspace/hooks/use-workspace-tabs'
import { saveCurrentWorkspace } from '@renderer/features/sql-workspace/lib/workspace'
import { useSqlWorkspaceStore } from '@renderer/features/sql-workspace/stores/sql-workspace-store'
import type { Tab } from '@renderer/features/sql-workspace/stores/tab-store'
import { useRouter } from '@tanstack/react-router'
import { Lock, PanelLeftClose, PanelLeftOpen, Plus, Unplug } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { SortableTabButton } from './sortable-tab-button'

interface WorkspaceTopbarProps {
  profile: SQLConnectionProfile
  isSidebarOpen: boolean
  onSidebarOpenChange: (open: boolean) => void
  requestCloseTab: (tab: Tab) => void
}

export function WorkspaceTopbar({
  profile,
  isSidebarOpen,
  onSidebarOpenChange,
  requestCloseTab
}: WorkspaceTopbarProps) {
  const router = useRouter()
  const { mutate: disconnect, isPending: isDisconnecting } = useDisconnect()

  const { reset: resetWorkspace } = useSqlWorkspaceStore()

  const { tabs, tabCalculations, handleTabClick, handleAddQueryTab, handleMoveTab, reset } =
    useWorkspaceTabs()

  const handleCloseTab = (tab: Tab) => {
    requestCloseTab(tab)
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 }
    })
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const oldIndex = tabs.findIndex((tab) => tab.id === active.id)
      const newIndex = tabs.findIndex((tab) => tab.id === over.id)

      if (oldIndex === -1 || newIndex === -1) return

      handleMoveTab(oldIndex, newIndex)
    },
    [tabs, handleMoveTab]
  )

  // Memoize tab IDs to prevent unnecessary re-renders
  const tabIds = useMemo(() => tabs.map((tab) => tab.id), [tabs])

  const isReadOnly = profile.options.readOnly === true

  return (
    <>
      <TabNavigation
        profile={profile}
        requestCloseTab={handleCloseTab}
        onTabClick={handleTabClick}
        onAddQueryTab={handleAddQueryTab}
      />
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
          <DndContext
            sensors={sensors}
            onDragEnd={handleDragEnd}
            collisionDetection={closestCenter}
          >
            <SortableContext items={tabIds} strategy={horizontalListSortingStrategy}>
              <div className="flex h-full items-center">
                {tabCalculations.map(({ tab, isActive, isDirty }) => (
                  <SortableTabButton
                    key={tab.id}
                    tab={tab}
                    isActive={isActive}
                    isDirty={isDirty}
                    onClick={() => handleTabClick(tab.id)}
                    onClose={() => handleCloseTab(tab)}
                  />
                ))}
                <button
                  onClick={handleAddQueryTab}
                  className="flex items-center justify-center h-full w-10 border-r border-border/50 hover:bg-background/60 cursor-pointer shrink-0"
                  title="New Query"
                >
                  <Plus className="size-4 text-muted-foreground" />
                  <span className="sr-only">New query tab</span>
                </button>
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {isReadOnly && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className="mr-2 gap-1 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
              >
                <Lock className="size-3" />
                Read-only
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              Writes are disabled for this connection. Edit the connection to allow writes.
            </TooltipContent>
          </Tooltip>
        )}

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
    </>
  )
}
